import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, subAdminProcedure, publicProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { eq, and, gte, lte, isNull, inArray } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";

/**
 * 日本時間（JST, UTC+9）の1日の開始・終了（UTC時刻）を返す
 * DBに保存されている日時はUTC想定なので、JSTの0:00〜23:59:59に対応するUTC範囲で絞り込む
 */
function getJstDayRangeForNow(): { start: Date; end: Date } {
    const now = new Date();
    // now を JST に変換（+9時間）
    const jstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const year = jstNow.getUTCFullYear();
    const month = jstNow.getUTCMonth();
    const day = jstNow.getUTCDate();

    // JST の 0:00 / 23:59:59 に対応する UTC 時刻を作成
    const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));
    return { start, end };
}

/**
 * 指定された日付文字列（YYYY-MM-DD, JST想定）の1日の開始・終了（UTC時刻）を返す
 */
function getJstDayRangeFromDateString(dateStr: string): { start: Date; end: Date } {
    const [year, month, day] = dateStr.split("-").map((v) => parseInt(v, 10));
    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    return { start, end };
}

/**
 * JSTの日付が同じかどうかを判定するヘルパー
 */
function isSameJstDate(a: Date, b: Date): boolean {
    const toJst = (d: Date) => new Date(d.getTime() + 9 * 60 * 60 * 1000);
    const aj = toJst(a);
    const bj = toJst(b);
    return (
        aj.getUTCFullYear() === bj.getUTCFullYear() &&
        aj.getUTCMonth() === bj.getUTCMonth() &&
        aj.getUTCDate() === bj.getUTCDate()
    );
}

// "2025-11-27T08:30:00+09:00" から "HH:MM" だけ抜き出す
function extractTimeFromIso(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const parts = iso.split("T");
    if (parts.length < 2) return null;
    const timePart = parts[1]; // "08:30:00+09:00"
    const [hhmm] = timePart.split("+"); // "08:30:00"
    const [h, m] = hhmm.split(":");
    if (!h || !m) return null;
    return `${h}:${m}`; // "08:30"
}

// Date から "HH:MM" を取り出す
function extractTimeFromDate(d: Date | null | undefined): string | null {
    if (!d) return null;
    const h = String(d.getUTCHours()).padStart(2, "0");
    const m = String(d.getUTCMinutes()).padStart(2, "0");
    return `${h}:${m}`;
}

// "YYYY-MM-DD" と "HH:MM" から、その日の JST の Date を作成（DBはUTCで保存）
function makeJstDate(workDate: string, timeStr: string): Date {
    const [y, mo, d] = workDate.split("-").map((v) => parseInt(v, 10));
    const [h, mi] = timeStr.split(":").map((v) => parseInt(v, 10));
    // JST(UTC+9) の y/mo/d h:mi を UTC に変換して Date を作成
    return new Date(Date.UTC(y, mo - 1, d, h - 9, mi, 0, 0));
}

// 分を 0〜(23*60+59) に収める
function clampMinutes(m: number): number {
    const MIN = 0;
    const MAX = 23 * 60 + 59;
    if (Number.isNaN(m)) return MIN;
    return Math.min(Math.max(m, MIN), MAX);
}

/**
 * 出勤時刻と退勤時刻の間に含まれる休憩時間の合計を計算
 */
export async function calculateBreakTimeMinutes(
    clockIn: Date,
    clockOut: Date,
    db: Awaited<ReturnType<typeof getDb>>
): Promise<number> {
    if (!db) return 0;

    // アクティブな休憩時間を取得
    // isActiveはmysqlEnum型なので、文字列"true"で比較
    // Drizzle ORMのeq関数がmysqlEnumを正しく扱えないため、全件取得してからフィルタリング
    let breakTimes: any[] = [];
    try {
        const allBreakTimes = await db
            .select()
            .from(schema.breakTimes);
        breakTimes = allBreakTimes.filter(bt => bt.isActive === "true");
    } catch (error) {
        console.warn("[calculateBreakTimeMinutes] Failed to fetch break times:", error);
        // テーブルが存在しない場合やエラーが発生した場合は、空配列を返す
        breakTimes = [];
    }

    let totalBreakMinutes = 0;

    const clockInDate = new Date(clockIn);
    const clockOutDate = new Date(clockOut);

    // 出勤日と退勤日が異なる場合も考慮
    const clockInDay = new Date(clockInDate.getFullYear(), clockInDate.getMonth(), clockInDate.getDate());
    const clockOutDay = new Date(clockOutDate.getFullYear(), clockOutDate.getMonth(), clockOutDate.getDate());
    const daysDiff = Math.floor((clockOutDay.getTime() - clockInDay.getTime()) / (1000 * 60 * 60 * 24));

    for (const breakTime of breakTimes) {
        // 休憩時間の開始時刻と終了時刻をDateオブジェクトに変換
        const [breakStartHour, breakStartMinute] = breakTime.startTime.split(":").map(Number);
        const [breakEndHour, breakEndMinute] = breakTime.endTime.split(":").map(Number);

        // 出勤日と退勤日の両方で休憩時間をチェック（日を跨ぐ場合に対応）
        for (let dayOffset = 0; dayOffset <= daysDiff; dayOffset++) {
            const checkDate = new Date(clockInDay);
            checkDate.setDate(checkDate.getDate() + dayOffset);

            // その日の休憩時間を作成
            const breakStart = new Date(checkDate);
            breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);

            const breakEnd = new Date(checkDate);
            breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);

            // 休憩時間が日を跨ぐ場合（例: 23:00-01:00）
            if (breakEnd < breakStart) {
                breakEnd.setDate(breakEnd.getDate() + 1);
            }

            // 出勤時刻と退勤時刻の間に休憩時間が含まれるかチェック
            // 重なっているかどうかを判定: 勤務時間と休憩時間が重なっている場合
            // 条件: clockInDate < breakEnd && clockOutDate > breakStart
            const hasOverlap = clockInDate < breakEnd && clockOutDate > breakStart;

            if (hasOverlap) {
                // 重なっている部分を計算
                const overlapStart = clockInDate > breakStart ? clockInDate : breakStart;
                const overlapEnd = clockOutDate < breakEnd ? clockOutDate : breakEnd;

                // 重なっている時間が正の値であることを確認
                if (overlapStart < overlapEnd) {
                    // 重なっている時間（分）を計算
                    const overlapMinutes = Math.floor(
                        (overlapEnd.getTime() - overlapStart.getTime()) / 1000 / 60
                    );
                    // 重なっている時間が0より大きい場合のみ追加
                    if (overlapMinutes > 0) {
                        totalBreakMinutes += overlapMinutes;
                    }
                }
            }
        }
    }

    return totalBreakMinutes;
}

export const attendanceRouter = createTRPCRouter({
    // 今日の出退勤状況を取得（JST基準で「今日」のレコードを判定）
    getTodayStatus: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "データベースに接続できません",
            });
        }

        // そのユーザーの最新の出勤記録を1件取得
        const { desc } = await import("drizzle-orm");
        const [record] = await db
            .select()
            .from(schema.attendanceRecords)
            .where(eq(schema.attendanceRecords.userId, ctx.user!.id))
            .orderBy(desc(schema.attendanceRecords.clockIn))
            .limit(1);

        // レコードが無い、またはJST基準で今日ではない場合は null
        const now = new Date();
        if (!record || !isSameJstDate(record.clockIn, now)) {
            return null;
        }
        // 退勤時刻がある場合、勤務時間を再計算
        let workDuration = record.workDuration;
        if (record.clockOut) {
            const totalMinutes = Math.floor(
                (record.clockOut.getTime() - record.clockIn.getTime()) / 1000 / 60
            );
            const breakMinutes = await calculateBreakTimeMinutes(record.clockIn, record.clockOut, db);
            workDuration = Math.max(0, totalMinutes - breakMinutes);
        }
        return {
            id: record.id,
            clockIn: record.clockIn,
            clockOut: record.clockOut,
            workDuration,
        };
    }),

    // 出勤打刻（準管理者以上）
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

            // 日本時間の「今日」の0:00〜23:59:59に対応するUTC範囲で重複確認
            const { start, end } = getJstDayRangeForNow();

            // 今日の出勤記録を確認
            const existing = await db
                .select()
                .from(schema.attendanceRecords)
                .where(
                    and(
                        eq(schema.attendanceRecords.userId, ctx.user!.id),
                        gte(schema.attendanceRecords.clockIn, start),
                        lte(schema.attendanceRecords.clockIn, end)
                    )
                )
                .limit(1);

            if (existing.length > 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "今日は既に出勤しています",
                });
            }

            await db
                .insert(schema.attendanceRecords)
                .values({
                    userId: ctx.user!.id,
                    clockIn: new Date(),
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
                clockIn: inserted.clockIn,
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

        // 最新の未退勤記録を取得
        const records = await db
            .select()
            .from(schema.attendanceRecords)
            .where(
                and(
                    eq(schema.attendanceRecords.userId, ctx.user!.id),
                    isNull(schema.attendanceRecords.clockOut)
                )
            )
            .orderBy(schema.attendanceRecords.clockIn)
            .limit(1);

        if (records.length === 0) {
            throw new TRPCError({
                code: "BAD_REQUEST",
                message: "出勤記録が見つかりません",
            });
        }

        const record = records[0];
        const clockOut = new Date();
        const totalMinutes = Math.floor((clockOut.getTime() - record.clockIn.getTime()) / 1000 / 60);
        const breakMinutes = await calculateBreakTimeMinutes(record.clockIn, clockOut, db);
        const workDuration = Math.max(0, totalMinutes - breakMinutes); // 負の値にならないようにする

        await db
            .update(schema.attendanceRecords)
            .set({
                clockOut,
                clockOutDevice: "pc",
                workDuration,
            })
            .where(eq(schema.attendanceRecords.id, record.id));

        return {
            id: record.id,
            clockOut,
            workDuration,
        };
    }),

    // 全スタッフの「今日」の出退勤状況を取得（準管理者以上・JSTの今日を日付範囲で判定）
    getAllStaffToday: subAdminProcedure.query(async () => {
        try {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            // 日本時間の「今日」の0:00〜23:59:59に対応するUTC範囲で絞り込む
            const { start, end } = getJstDayRangeForNow();

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
                                    gte(schema.attendanceRecords.clockIn, start),
                                    lte(schema.attendanceRecords.clockIn, end)
                                )
                            )
                            .limit(1);
                        const attendance = attendanceRecords[0] || null;

                        // 退勤時刻がある場合、勤務時間を再計算
                        let workDuration = attendance?.workDuration || null;
                        if (attendance && attendance.clockOut) {
                            try {
                                const totalMinutes = Math.floor(
                                    (attendance.clockOut.getTime() - attendance.clockIn.getTime()) / 1000 / 60
                                );
                                const breakMinutes = await calculateBreakTimeMinutes(
                                    attendance.clockIn,
                                    attendance.clockOut,
                                    db
                                );
                                workDuration = Math.max(0, totalMinutes - breakMinutes);
                            } catch (error) {
                                console.error(`Error calculating break time for user ${user.id}:`, error);
                                // エラーが発生した場合は既存のworkDurationを使用
                            }
                        }

                        return {
                            userId: user.id,
                            userName: user.name || user.username,
                            attendance: attendance
                                ? {
                                    id: attendance.id,
                                    clockIn: attendance.clockIn,
                                    clockOut: attendance.clockOut,
                                    workDuration,
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

    // 特定日の全スタッフの出退勤状況を取得（準管理者以上）
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

                // 入力された日付（YYYY-MM-DD, JST想定）の0:00〜23:59:59に対応するUTC範囲を取得
                const { start, end } = getJstDayRangeFromDateString(input.date);

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
                                        gte(schema.attendanceRecords.clockIn, start),
                                        lte(schema.attendanceRecords.clockIn, end)
                                    )
                                )
                                .orderBy(schema.attendanceRecords.clockIn)
                                .limit(1);

                            // 退勤時刻がある場合、勤務時間を再計算
                            let workDuration = attendance?.workDuration || null;
                            if (attendance && attendance.clockOut) {
                                try {
                                    const totalMinutes = Math.floor(
                                        (attendance.clockOut.getTime() - attendance.clockIn.getTime()) / 1000 / 60
                                    );
                                    const breakMinutes = await calculateBreakTimeMinutes(
                                        attendance.clockIn,
                                        attendance.clockOut,
                                        db
                                    );
                                    workDuration = Math.max(0, totalMinutes - breakMinutes);
                                } catch (error) {
                                    console.error(`Error calculating break time for user ${user.id}:`, error);
                                    // エラーが発生した場合は既存のworkDurationを使用
                                }
                            }

                            return {
                                userId: user.id,
                                userName: user.name || user.username,
                                attendance: attendance
                                    ? {
                                        id: attendance.id,
                                        clockIn: attendance.clockIn,
                                        clockOut: attendance.clockOut,
                                        workDuration,
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
                clockIn: z.string(),
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

            // 入力された日時（JST想定）から日付部分(YYYY-MM-DD)だけを取り出し、
            // その日のJST 0:00〜23:59:59に対応するUTC範囲で重複確認
            const dateStr = input.clockIn.split("T")[0]; // "2025-11-26"
            const { start, end } = getJstDayRangeFromDateString(dateStr);

            // その日の出勤記録を確認
            const existing = await db
                .select()
                .from(schema.attendanceRecords)
                .where(
                    and(
                        eq(schema.attendanceRecords.userId, input.userId),
                        gte(schema.attendanceRecords.clockIn, start),
                        lte(schema.attendanceRecords.clockIn, end)
                    )
                )
                .limit(1);

            if (existing.length > 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "その日は既に出勤しています",
                });
            }

            // 実際に保存するclockInは、入力文字列から生成したDate（UTC）をそのまま使用
            const clockInTime = new Date(input.clockIn);
            await db
                .insert(schema.attendanceRecords)
                .values({
                    userId: input.userId,
                    clockIn: clockInTime,
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

            // 指定日の未退勤記録を取得（userId + workDate で限定）
            const { start, end } = getJstDayRangeFromDateString(input.workDate);
            const [record] = await db
                .select()
                .from(schema.attendanceRecords)
                .where(
                    and(
                        eq(schema.attendanceRecords.userId, input.userId),
                        isNull(schema.attendanceRecords.clockOut),
                        gte(schema.attendanceRecords.clockIn, start),
                        lte(schema.attendanceRecords.clockIn, end)
                    )
                )
                .orderBy(schema.attendanceRecords.clockIn)
                .limit(1);

            if (!record) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "出勤記録が見つかりません",
                });
            }

            // workDate と HH:MM から同じ日の退勤時刻を生成
            const effectiveClockOut = makeJstDate(input.workDate, input.time);

            const totalMinutes = Math.floor(
                (effectiveClockOut.getTime() - record.clockIn.getTime()) / 1000 / 60
            );
            const breakMinutes = await calculateBreakTimeMinutes(record.clockIn, effectiveClockOut, db);
            const workDuration = Math.max(0, totalMinutes - breakMinutes); // 負の値にならないようにする

            await db
                .update(schema.attendanceRecords)
                .set({
                    clockOut: effectiveClockOut,
                    clockOutDevice: "pc",
                    workDuration,
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
                clockIn: z.string().optional(), // "....T08:30:00+09:00"
                // 退勤時刻は「文字列 or null or 未指定」を許可
                clockOut: z.string().nullable().optional(),
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

            // 既存の記録を取得（更新前の値を保持するため）
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

            const updateData: any = {};

            // 1) まず "HH:MM" を取り出す（入力が無ければ既存レコードから取り出す）
            let inTimeStr = extractTimeFromIso(input.clockIn) ?? extractTimeFromDate(record.clockIn);
            let outTimeStr =
                input.clockOut !== undefined
                    ? extractTimeFromIso(input.clockOut)
                    : extractTimeFromDate(record.clockOut);

            // どちらも無い場合はデフォルト 08:00-17:00 とする
            if (!inTimeStr && !outTimeStr) {
                inTimeStr = "08:00";
                outTimeStr = "17:00";
            }
            if (!inTimeStr && outTimeStr) {
                inTimeStr = outTimeStr;
            }
            if (!outTimeStr && inTimeStr) {
                outTimeStr = inTimeStr;
            }

            // "HH:MM" -> 分
            const toMinutes = (t: string) => {
                const [h, m] = t.split(":").map((v) => parseInt(v, 10));
                return clampMinutes(h * 60 + m);
            };

            const inMin = toMinutes(inTimeStr!);
            const outMin = toMinutes(outTimeStr!);

            // 早い方を出勤、遅い方を退勤
            let start = Math.min(inMin, outMin);
            let end = Math.max(inMin, outMin);

            const pad = (n: number) => String(n).padStart(2, "0");
            const startStr = `${pad(Math.floor(start / 60))}:${pad(start % 60)}`;
            const endStr = `${pad(Math.floor(end / 60))}:${pad(end % 60)}`;

            const newClockIn = makeJstDate(input.workDate, startStr);
            const newClockOut = makeJstDate(input.workDate, endStr);

            const totalMinutes = end - start;
            const breakMinutes = await calculateBreakTimeMinutes(newClockIn, newClockOut, db);
            const workDuration = Math.max(0, totalMinutes - breakMinutes);

            updateData.clockIn = newClockIn;
            updateData.clockOut = newClockOut;
            updateData.workDuration = workDuration;

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

            // 編集履歴を記録（更新前の値を使用）
            if (input.clockIn) {
                await db.insert(schema.attendanceEditLogs).values({
                    attendanceId: input.attendanceId,
                    editorId: ctx.user!.id,
                    fieldName: "clockIn",
                    oldValue: record.clockIn,
                    newValue: new Date(input.clockIn),
                });
            }
            if (input.clockOut !== undefined) {
                await db.insert(schema.attendanceEditLogs).values({
                    attendanceId: input.attendanceId,
                    editorId: ctx.user!.id,
                    fieldName: "clockOut",
                    oldValue: record.clockOut,
                    newValue: input.clockOut ? new Date(input.clockOut) : null,
                });
            }

            return {
                success: true,
                attendance: {
                    id: updatedRecord.id,
                    clockIn: updatedRecord.clockIn,
                    clockOut: updatedRecord.clockOut,
                    workDuration: updatedRecord.workDuration,
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
            const today = new Date(now);
            const start = startOfDay(today);
            const end = endOfDay(today);

            // 今日の未退勤記録を取得
            const unclosedRecords = await db
                .select()
                .from(schema.attendanceRecords)
                .where(
                    and(
                        gte(schema.attendanceRecords.clockIn, start),
                        lte(schema.attendanceRecords.clockIn, end),
                        isNull(schema.attendanceRecords.clockOut)
                    )
                );

            let count = 0;

            for (const record of unclosedRecords) {
                // 出勤日の「日本時間23:59:59」に相当するUTC時刻を設定
                const year = record.clockIn.getUTCFullYear();
                const month = record.clockIn.getUTCMonth();
                const day = record.clockIn.getUTCDate();
                // JST(UTC+9)の23:59:59はUTCでは14:59:59
                const clockOutTime = new Date(Date.UTC(year, month, day, 14, 59, 59));

                const totalMinutes = Math.floor(
                    (clockOutTime.getTime() - record.clockIn.getTime()) / 1000 / 60
                );
                const breakMinutes = await calculateBreakTimeMinutes(record.clockIn, clockOutTime, db);
                const workDuration = Math.max(0, totalMinutes - breakMinutes);

                await db
                    .update(schema.attendanceRecords)
                    .set({
                        clockOut: clockOutTime,
                        clockOutDevice: "auto-23:59",
                        workDuration,
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

