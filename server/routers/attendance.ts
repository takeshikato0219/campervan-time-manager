import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, subAdminProcedure, publicProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { eq, and, isNull, inArray } from "drizzle-orm";

// ==== ここから新しい時間計算ロジック（UTC/タイムゾーンは一切使わない）====

// "HH:MM" → 分（0〜1439）。不正値は null。
function timeToMinutes(t?: string | null): number | null {
    if (!t) return null;
    const [hh, mm] = t.split(":");
    const h = Number(hh);
    const m = Number(mm);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    const total = h * 60 + m;
    if (total < 0 || total > 23 * 60 + 59) return null;
    return total;
}

// 分（0〜1439）→ "HH:MM"
function minutesToTime(mins: number): string {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, mins));
    const h = String(Math.floor(clamped / 60)).padStart(2, "0");
    const m = String(clamped % 60).padStart(2, "0");
    return `${h}:${m}`;
}

// 出勤・退勤の文字列を「同じ日の start/end」と「勤務分」に正規化
function normalizeWorkTimes(
    inStr?: string | null,
    outStr?: string | null
): { clockInTime: string; clockOutTime: string; rawMinutes: number } {
    let inMin = timeToMinutes(inStr);
    let outMin = timeToMinutes(outStr);

    // どちらも無い場合は 08:30-17:30 を仮の範囲にする
    if (inMin == null && outMin == null) {
        inMin = 8 * 60 + 30;
        outMin = 17 * 60 + 30;
    }
    // 片方だけ入っている場合は同じ値にする
    if (inMin == null && outMin != null) inMin = outMin;
    if (outMin == null && inMin != null) outMin = inMin;

    const start = Math.min(inMin!, outMin!);
    const end = Math.max(inMin!, outMin!);
    const rawMinutes = Math.max(0, end - start);

    return {
        clockInTime: minutesToTime(start),
        clockOutTime: minutesToTime(end),
        rawMinutes,
    };
}

// DB からアクティブな休憩時間を取得
async function getActiveBreakTimes(db: Awaited<ReturnType<typeof getDb>>): Promise<any[]> {
    if (!db) return [];
    try {
        const all = await db.select().from(schema.breakTimes);
        return all.filter((bt) => bt.isActive === "true");
    } catch (error) {
        console.warn("[attendance] Failed to fetch breakTimes:", error);
        return [];
    }
}

// 勤務時間（分）から、休憩を差し引いた「実労働分」を計算
async function calculateWorkMinutes(
    clockInTime: string,
    clockOutTime: string,
    db: Awaited<ReturnType<typeof getDb>>
): Promise<number> {
    const startMin = timeToMinutes(clockInTime);
    const endMin = timeToMinutes(clockOutTime);
    if (startMin == null || endMin == null) return 0;
    if (!db) return Math.max(0, endMin - startMin);

    const baseMinutes = Math.max(0, endMin - startMin);
    const breakTimes = await getActiveBreakTimes(db);

    let breakTotal = 0;
    for (const bt of breakTimes) {
        const s = timeToMinutes(bt.startTime);
        const eRaw = timeToMinutes(bt.endTime);
        if (s == null || eRaw == null) continue;
        let e = eRaw;
        // 休憩の方が日を跨いでいても、勤務は同一日なので実質重ならないが、
        // 一応 24h を足して「翌日まで続く」として扱う。
        if (e < s) {
            e += 24 * 60;
        }

        // 勤務区間 [startMin, endMin] と休憩区間 [s, e] の重なり
        const overlapStart = Math.max(startMin, s);
        const overlapEnd = Math.min(endMin, e);
        if (overlapEnd > overlapStart) {
            breakTotal += overlapEnd - overlapStart;
        }
    }

    const result = Math.max(0, baseMinutes - breakTotal);
    return result;
}

// ==== ここまで新しい時間計算ロジック ====

export const attendanceRouter = createTRPCRouter({
    // 今日の出退勤状況を取得（workDate + HH:MM ベース）
    getTodayStatus: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "データベースに接続できません",
            });
        }

        // 今日の日付文字列（ローカルJST前提）
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const todayStr = `${y}-${m}-${d}`;

        // そのユーザーの今日の出勤記録を1件取得（基本1件想定）
        const { desc } = await import("drizzle-orm");
        const [record] = await db
            .select()
            .from(schema.attendanceRecords)
            .where(
                and(
                    eq(schema.attendanceRecords.userId, ctx.user!.id),
                    eq(schema.attendanceRecords.workDate, new Date(todayStr))
                )
            )
            .orderBy(desc(schema.attendanceRecords.id))
            .limit(1);

        if (!record) {
            return null;
        }

        const workMinutes =
            record.clockInTime && record.clockOutTime
                ? await calculateWorkMinutes(record.clockInTime, record.clockOutTime, db)
                : record.workMinutes ?? null;

        return {
            id: record.id,
            workDate: record.workDate,
            clockInTime: record.clockInTime,
            clockOutTime: record.clockOutTime,
            workMinutes,
        };
    }),

    // 出勤打刻（準管理者以上）※通常は管理画面から行う想定
    clockIn: subAdminProcedure
        .input(
            z.object({
                deviceType: z.enum(["pc", "mobile"]).optional().default("pc"),
            })
        )
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, "0");
            const d = String(now.getDate()).padStart(2, "0");
            const todayStr = `${y}-${m}-${d}`;
            const hh = String(now.getHours()).padStart(2, "0");
            const mm = String(now.getMinutes()).padStart(2, "0");
            const timeStr = `${hh}:${mm}`;

            // 今日の出勤記録を確認（1日1件想定）
            const [existing] = await db
                .select()
                .from(schema.attendanceRecords)
                .where(
                    and(
                        eq(schema.attendanceRecords.userId, ctx.user!.id),
                        eq(schema.attendanceRecords.workDate, new Date(todayStr))
                    )
                )
                .limit(1);

            if (existing) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "今日は既に出勤しています",
                });
            }

            await db
                .insert(schema.attendanceRecords)
                .values({
                    userId: ctx.user!.id,
                    workDate: new Date(todayStr),
                    clockInTime: timeStr,
                    clockInDevice: input.deviceType,
                });

            // 挿入されたレコードを取得（最新のものを取得）
            const { desc } = await import("drizzle-orm");
            const [inserted] = await db
                .select()
                .from(schema.attendanceRecords)
                .where(eq(schema.attendanceRecords.userId, ctx.user!.id))
                .orderBy(desc(schema.attendanceRecords.id))
                .limit(1);

            if (!inserted) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "出勤記録の作成に失敗しました",
                });
            }

            return {
                id: inserted.id,
                workDate: inserted.workDate,
                clockInTime: inserted.clockInTime,
            };
        }),

    // 退勤打刻
    clockOut: protectedProcedure.mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "データベースに接続できません",
            });
        }

        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const todayStr = `${y}-${m}-${d}`;
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const timeStr = `${hh}:${mm}`;

        // 今日の未退勤記録を取得
        const [record] = await db
            .select()
            .from(schema.attendanceRecords)
            .where(
                and(
                    eq(schema.attendanceRecords.userId, ctx.user!.id),
                    eq(schema.attendanceRecords.workDate, new Date(todayStr))
                )
            )
            .limit(1);

        if (!record) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "出勤記録が見つかりません",
            });
        }

        const norm = normalizeWorkTimes(record.clockInTime, timeStr);
        const workMinutes = await calculateWorkMinutes(norm.clockInTime, norm.clockOutTime, db);

        await db
            .update(schema.attendanceRecords)
            .set({
                workDate: new Date(todayStr),
                clockInTime: norm.clockInTime,
                clockOutTime: norm.clockOutTime,
                workMinutes,
                clockOutDevice: "pc",
            })
            .where(eq(schema.attendanceRecords.id, record.id));

        return {
            id: record.id,
            workDate: todayStr,
            clockInTime: norm.clockInTime,
            clockOutTime: norm.clockOutTime,
            workMinutes,
        };
    }),

    // 全スタッフの「今日」の出退勤状況を取得（準管理者以上・workDate ベース）
    getAllStaffToday: subAdminProcedure.query(async () => {
        try {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, "0");
            const d = String(now.getDate()).padStart(2, "0");
            const todayStr = `${y}-${m}-${d}`;

            // 全ユーザーを取得（nameやcategoryカラムが存在しない場合に対応）
            const { selectUsersSafely } = await import("../db");
            const allUsers = await selectUsersSafely(db);

            // 各ユーザーの出退勤記録を取得
            const result = await Promise.all(
                allUsers.map(async (user) => {
                    try {
                        const attendanceRecords = await db
                            .select()
                            .from(schema.attendanceRecords)
                            .where(
                                and(
                                    eq(schema.attendanceRecords.userId, user.id),
                                    eq(schema.attendanceRecords.workDate, new Date(todayStr))
                                )
                            )
                            .limit(1);
                        const attendance = attendanceRecords[0] || null;

                        const workMinutes =
                            attendance?.clockInTime && attendance?.clockOutTime
                                ? await calculateWorkMinutes(attendance.clockInTime, attendance.clockOutTime, db)
                                : attendance?.workMinutes ?? null;

                        return {
                            userId: user.id,
                            userName: user.name || user.username,
                            attendance: attendance
                                ? {
                                    id: attendance.id,
                                    workDate: attendance.workDate,
                                    clockInTime: attendance.clockInTime,
                                    clockOutTime: attendance.clockOutTime,
                                    workMinutes,
                                    clockInDevice: attendance.clockInDevice,
                                    clockOutDevice: attendance.clockOutDevice,
                                }
                                : null,
                        };
                    } catch (error) {
                        console.error(`Error processing user ${user.id}:`, error);
                        // エラーが発生したユーザーはnullのattendanceを返す
                        return {
                            userId: user.id,
                            userName: user.name || user.username,
                            attendance: null,
                        };
                    }
                })
            );

            return result;
        } catch (error) {
            console.error("Error in getAllStaffToday:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "スタッフ情報の取得に失敗しました",
            });
        }
    }),

    // 特定日の全スタッフの出退勤状況を取得（準管理者以上・workDate ベース）
    getAllStaffByDate: subAdminProcedure
        .input(z.object({ date: z.string() }))
        .query(async ({ input }) => {
            try {
                const db = await getDb();
                if (!db) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "データベースに接続できません",
                    });
                }

                // 全ユーザーを取得（nameやcategoryカラムが存在しない場合に対応）
                const { selectUsersSafely } = await import("../db");
                const allUsers = await selectUsersSafely(db);

                // 各ユーザーの出退勤記録を取得（指定日の出勤記録のみ）
                const result = await Promise.all(
                    allUsers.map(async (user) => {
                        try {
                            // 指定日の出勤記録のみを取得（clockInが指定日の範囲内）
                            const [attendance] = await db
                                .select()
                                .from(schema.attendanceRecords)
                                .where(
                                    and(
                                        eq(schema.attendanceRecords.userId, user.id),
                                        eq(schema.attendanceRecords.workDate, new Date(input.date))
                                    )
                                )
                                .limit(1);

                            const workMinutes =
                                attendance?.clockInTime && attendance?.clockOutTime
                                    ? await calculateWorkMinutes(attendance.clockInTime, attendance.clockOutTime, db)
                                    : attendance?.workMinutes ?? null;

                            return {
                                userId: user.id,
                                userName: user.name || user.username,
                                attendance: attendance
                                    ? {
                                        id: attendance.id,
                                        workDate: attendance.workDate,
                                        clockInTime: attendance.clockInTime,
                                        clockOutTime: attendance.clockOutTime,
                                        workMinutes,
                                        clockInDevice: attendance.clockInDevice,
                                        clockOutDevice: attendance.clockOutDevice,
                                    }
                                    : null,
                            };
                        } catch (error) {
                            console.error(`Error processing user ${user.id}:`, error);
                            // エラーが発生したユーザーはnullのattendanceを返す
                            return {
                                userId: user.id,
                                userName: user.name || user.username,
                                attendance: null,
                            };
                        }
                    })
                );

                return result;
            } catch (error) {
                console.error("Error in getAllStaffByDate:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error instanceof Error ? error.message : "スタッフ情報の取得に失敗しました",
                });
            }
        }),

    // 管理者が代理で出勤打刻（準管理者以上）
    adminClockIn: subAdminProcedure
        .input(
            z.object({
                userId: z.number(),
                workDate: z.string(), // "YYYY-MM-DD"
                time: z.string(), // "HH:MM"
                deviceType: z.enum(["pc", "mobile"]).optional().default("pc"),
            })
        )
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            // その日の出勤記録を確認
            const [existing] = await db
                .select()
                .from(schema.attendanceRecords)
                .where(
                    and(
                        eq(schema.attendanceRecords.userId, input.userId),
                        eq(schema.attendanceRecords.workDate, new Date(input.workDate))
                    )
                )
                .limit(1);

            if (existing) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "その日は既に出勤しています",
                });
            }

            await db
                .insert(schema.attendanceRecords)
                .values({
                    userId: input.userId,
                    workDate: new Date(input.workDate),
                    clockInTime: input.time,
                    clockInDevice: input.deviceType,
                });

            const [user] = await db
                .select()
                .from(schema.users)
                .where(eq(schema.users.id, input.userId))
                .limit(1);

            return {
                id: input.userId,
                userName: user?.name || user?.username || "不明",
            };
        }),

    // 管理者が代理で退勤打刻（準管理者以上）
    adminClockOut: subAdminProcedure
        .input(
            z.object({
                userId: z.number(),
                workDate: z.string(), // "YYYY-MM-DD" - 必ずこの日のレコードだけを対象にする
                time: z.string(),     // "HH:MM"
            })
        )
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            const [record] = await db
                .select()
                .from(schema.attendanceRecords)
                .where(
                    and(
                        eq(schema.attendanceRecords.userId, input.userId),
                        eq(schema.attendanceRecords.workDate, new Date(input.workDate))
                    )
                )
                .limit(1);

            if (!record) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "出勤記録が見つかりません",
                });
            }

            const norm = normalizeWorkTimes(record.clockInTime, input.time);
            const workMinutes = await calculateWorkMinutes(norm.clockInTime, norm.clockOutTime, db);

            await db
                .update(schema.attendanceRecords)
                .set({
                    workDate: new Date(input.workDate),
                    clockInTime: norm.clockInTime,
                    clockOutTime: norm.clockOutTime,
                    workMinutes,
                    clockOutDevice: "pc",
                })
                .where(eq(schema.attendanceRecords.id, record.id));

            const [user] = await db
                .select()
                .from(schema.users)
                .where(eq(schema.users.id, input.userId))
                .limit(1);

            return {
                id: input.userId,
                userName: user?.name || user?.username || "不明",
            };
        }),

    // 出退勤記録を更新（準管理者以上）
    updateAttendance: subAdminProcedure
        .input(
            z.object({
                attendanceId: z.number(),
                workDate: z.string(), // "YYYY-MM-DD" - 必ずこの日の中で正規化する
                clockInTime: z.string().nullable().optional(), // "HH:MM"
                clockOutTime: z.string().nullable().optional(), // "HH:MM"
            })
        )
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            // 既存の記録を取得
            const [record] = await db
                .select()
                .from(schema.attendanceRecords)
                .where(eq(schema.attendanceRecords.id, input.attendanceId))
                .limit(1);

            if (!record) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "出退勤記録が見つかりません",
                });
            }

            const norm = normalizeWorkTimes(
                input.clockInTime ?? record.clockInTime,
                input.clockOutTime ?? record.clockOutTime
            );
            const workMinutes = await calculateWorkMinutes(norm.clockInTime, norm.clockOutTime, db);

            const updateData: any = {
                workDate: new Date(input.workDate),
                clockInTime: norm.clockInTime,
                clockOutTime: norm.clockOutTime,
                workMinutes,
            };

            await db
                .update(schema.attendanceRecords)
                .set(updateData)
                .where(eq(schema.attendanceRecords.id, input.attendanceId));

            // 更新後のデータを取得して確認
            const [updatedRecord] = await db
                .select()
                .from(schema.attendanceRecords)
                .where(eq(schema.attendanceRecords.id, input.attendanceId))
                .limit(1);

            if (!updatedRecord) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "更新後のデータを取得できませんでした",
                });
            }

            return {
                success: true,
                attendance: {
                    id: updatedRecord.id,
                    workDate: updatedRecord.workDate,
                    clockInTime: updatedRecord.clockInTime,
                    clockOutTime: updatedRecord.clockOutTime,
                    workMinutes: updatedRecord.workMinutes,
                }
            };
        }),

    // 今日の未退勤記録を23:59に自動退勤（自動実行用、publicProcedureで実行可能）
    autoCloseTodayAt2359: publicProcedure.mutation(async () => {
        try {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, "0");
            const d = String(now.getDate()).padStart(2, "0");
            const todayStr = `${y}-${m}-${d}`;

            // 今日の未退勤記録を取得（clockOutTime が空のもの）
            const unclosedRecords = await db
                .select()
                .from(schema.attendanceRecords)
                .where(
                    and(
                        eq(schema.attendanceRecords.workDate, new Date(todayStr)),
                        isNull(schema.attendanceRecords.clockOutTime)
                    )
                );

            let count = 0;

            for (const record of unclosedRecords) {
                const norm = normalizeWorkTimes(record.clockInTime, "23:59");
                const workMinutes = await calculateWorkMinutes(norm.clockInTime, norm.clockOutTime, db);

                await db
                    .update(schema.attendanceRecords)
                    .set({
                        clockOutTime: norm.clockOutTime,
                        clockOutDevice: "auto-23:59",
                        workMinutes,
                    })
                    .where(eq(schema.attendanceRecords.id, record.id));

                count++;
            }

            if (count > 0) {
                console.log(`[自動退勤] ${count}件の未退勤記録を23:59に自動退勤処理しました`);
            }

            return { count };
        } catch (error) {
            console.error("Error in autoCloseTodayAt2359:", error);
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: error instanceof Error ? error.message : "自動退勤処理に失敗しました",
            });
        }
    }),

    // 出退勤記録を削除（準管理者以上）
    deleteAttendance: subAdminProcedure
        .input(z.object({ attendanceId: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            await db
                .delete(schema.attendanceRecords)
                .where(eq(schema.attendanceRecords.id, input.attendanceId));

            return { success: true };
        }),

    // 編集履歴を取得（準管理者以上）
    getEditLogs: subAdminProcedure
        .input(
            z.object({
                attendanceId: z.number().optional(),
                startDate: z.string().optional(),
                endDate: z.string().optional(),
            })
        )
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            let logs;
            if (input.attendanceId) {
                logs = await db
                    .select()
                    .from(schema.attendanceEditLogs)
                    .where(eq(schema.attendanceEditLogs.attendanceId, input.attendanceId))
                    .orderBy(schema.attendanceEditLogs.createdAt);
            } else {
                logs = await db
                    .select()
                    .from(schema.attendanceEditLogs)
                    .orderBy(schema.attendanceEditLogs.createdAt);
            }

            // ユーザー情報を取得（nameやcategoryカラムが存在しない場合に対応）
            const { selectUsersSafely } = await import("../db");
            const users = await selectUsersSafely(db);
            const userMap = new Map(users.map((u) => [u.id, u]));

            // 出退勤記録情報を取得
            const attendanceIds = [...new Set(logs.map((log) => log.attendanceId))];
            let attendances: any[] = [];
            if (attendanceIds.length > 0) {
                attendances = await db
                    .select()
                    .from(schema.attendanceRecords)
                    .where(inArray(schema.attendanceRecords.id, attendanceIds));
            }

            return logs.map((log) => {
                const editor = userMap.get(log.editorId);
                const attendance = attendances.find((a) => a.id === log.attendanceId);
                const attendanceUser = attendance ? userMap.get(attendance.userId) : null;

                return {
                    id: log.id,
                    attendanceId: log.attendanceId,
                    editorId: log.editorId,
                    editorName: editor?.name || editor?.username || "不明",
                    editorUsername: editor?.username || "不明",
                    userName: attendanceUser?.name || attendanceUser?.username || "不明",
                    fieldName: log.fieldName,
                    oldValue: log.oldValue,
                    newValue: log.newValue,
                    createdAt: log.createdAt,
                };
            });
        }),
});

