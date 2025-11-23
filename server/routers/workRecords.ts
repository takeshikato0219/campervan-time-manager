import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { eq, and, isNull, gte, lte } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";

export const workRecordsRouter = createTRPCRouter({
    // 作業中の記録を取得
    getActive: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) {
            return [];
        }

        const records = await db
            .select({
                id: schema.workRecords.id,
                vehicleId: schema.workRecords.vehicleId,
                processId: schema.workRecords.processId,
                startTime: schema.workRecords.startTime,
            })
            .from(schema.workRecords)
            .where(
                and(
                    eq(schema.workRecords.userId, ctx.user!.id),
                    isNull(schema.workRecords.endTime)
                )
            );

        // TODO: 車両情報、工程情報を結合

        return records.map((r) => ({
            id: r.id,
            vehicleId: r.vehicleId,
            vehicleNumber: "未取得",
            vehicleType: "未取得",
            processId: r.processId,
            processName: "未取得",
            startTime: r.startTime,
        }));
    }),

    // 今日の作業記録を取得
    getTodayRecords: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) {
            return [];
        }

        const today = new Date();
        const start = startOfDay(today);
        const end = endOfDay(today);

        const records = await db
            .select()
            .from(schema.workRecords)
            .where(
                and(
                    eq(schema.workRecords.userId, ctx.user!.id),
                    gte(schema.workRecords.startTime, start),
                    lte(schema.workRecords.startTime, end)
                )
            )
            .orderBy(schema.workRecords.startTime);

        // 車両情報、工程情報を取得
        const vehicles = await db.select().from(schema.vehicles);
        const processes = await db.select().from(schema.processes);

        const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
        const processMap = new Map(processes.map((p) => [p.id, p]));

        return records.map((r) => {
            const vehicle = vehicleMap.get(r.vehicleId);
            const process = processMap.get(r.processId);

            return {
                id: r.id,
                vehicleId: r.vehicleId,
                vehicleNumber: vehicle?.vehicleNumber || "不明",
                processId: r.processId,
                processName: process?.name || "不明",
                startTime: r.startTime,
                endTime: r.endTime,
                durationMinutes: r.endTime
                    ? Math.floor((r.endTime.getTime() - r.startTime.getTime()) / 1000 / 60)
                    : null,
                workDescription: r.workDescription,
            };
        });
    }),

    // 作業記録を作成
    create: protectedProcedure
        .input(
            z.object({
                userId: z.number(),
                vehicleId: z.number(),
                processId: z.number(),
                startTime: z.string(),
                endTime: z.string().optional(),
                workDescription: z.string().optional(),
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

            // 管理者のみ他のユーザーの記録を作成可能
            if (input.userId !== ctx.user!.id && ctx.user!.role !== "admin") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "権限がありません",
                });
            }

            const [result] = await db.insert(schema.workRecords).values({
                userId: input.userId,
                vehicleId: input.vehicleId,
                processId: input.processId,
                startTime: new Date(input.startTime),
                endTime: input.endTime ? new Date(input.endTime) : null,
                workDescription: input.workDescription,
            });

            return {
                id: result.insertId,
            };
        }),

    // 全スタッフの作業記録を取得（管理者専用）
    getAllRecords: adminProcedure.query(async () => {
        const db = await getDb();
        if (!db) {
            return [];
        }

        const records = await db
            .select()
            .from(schema.workRecords)
            .orderBy(schema.workRecords.startTime);

        // ユーザー、車両、工程情報を取得
        const users = await db.select().from(schema.users);
        const vehicles = await db.select().from(schema.vehicles);
        const processes = await db.select().from(schema.processes);

        const userMap = new Map(users.map((u) => [u.id, u]));
        const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
        const processMap = new Map(processes.map((p) => [p.id, p]));

        return records.map((r) => {
            const user = userMap.get(r.userId);
            const vehicle = vehicleMap.get(r.vehicleId);
            const process = processMap.get(r.processId);

            return {
                id: r.id,
                userId: r.userId,
                userName: user?.name || user?.username || "不明",
                vehicleId: r.vehicleId,
                vehicleNumber: vehicle?.vehicleNumber || "不明",
                processId: r.processId,
                processName: process?.name || "不明",
                startTime: r.startTime,
                endTime: r.endTime,
                durationMinutes: r.endTime
                    ? Math.floor((r.endTime.getTime() - r.startTime.getTime()) / 1000 / 60)
                    : null,
                workDescription: r.workDescription,
            };
        });
    }),

    // 作業記録を更新（管理者専用）
    update: adminProcedure
        .input(
            z.object({
                id: z.number(),
                vehicleId: z.number().optional(),
                processId: z.number().optional(),
                startTime: z.string().optional(),
                endTime: z.string().optional(),
                workDescription: z.string().optional(),
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

            const updateData: any = {};
            if (input.vehicleId !== undefined) updateData.vehicleId = input.vehicleId;
            if (input.processId !== undefined) updateData.processId = input.processId;
            if (input.startTime !== undefined) updateData.startTime = new Date(input.startTime);
            if (input.endTime !== undefined) updateData.endTime = input.endTime ? new Date(input.endTime) : null;
            if (input.workDescription !== undefined) updateData.workDescription = input.workDescription;

            await db
                .update(schema.workRecords)
                .set(updateData)
                .where(eq(schema.workRecords.id, input.id));

            return { success: true };
        }),

    // 自分の作業記録を更新（一般ユーザー用）
    updateMyRecord: protectedProcedure
        .input(
            z.object({
                id: z.number(),
                vehicleId: z.number().optional(),
                processId: z.number().optional(),
                startTime: z.string().optional(),
                endTime: z.string().optional(),
                workDescription: z.string().optional(),
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

            // 自分の記録か確認
            const [record] = await db
                .select()
                .from(schema.workRecords)
                .where(eq(schema.workRecords.id, input.id))
                .limit(1);

            if (!record) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "作業記録が見つかりません",
                });
            }

            if (record.userId !== ctx.user!.id) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "自分の記録のみ編集できます",
                });
            }

            const updateData: any = {};
            if (input.vehicleId !== undefined) updateData.vehicleId = input.vehicleId;
            if (input.processId !== undefined) updateData.processId = input.processId;
            if (input.startTime !== undefined) updateData.startTime = new Date(input.startTime);
            if (input.endTime !== undefined) updateData.endTime = input.endTime ? new Date(input.endTime) : null;
            if (input.workDescription !== undefined) updateData.workDescription = input.workDescription;

            await db
                .update(schema.workRecords)
                .set(updateData)
                .where(eq(schema.workRecords.id, input.id));

            return { success: true };
        }),

    // 作業記録を削除（管理者専用）
    delete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            await db.delete(schema.workRecords).where(eq(schema.workRecords.id, input.id));

            return { success: true };
        }),

    // 自分の作業記録を削除（一般ユーザー用）
    deleteMyRecord: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            // 自分の記録か確認
            const [record] = await db
                .select()
                .from(schema.workRecords)
                .where(eq(schema.workRecords.id, input.id))
                .limit(1);

            if (!record) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "作業記録が見つかりません",
                });
            }

            if (record.userId !== ctx.user!.id) {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "自分の記録のみ削除できます",
                });
            }

            await db.delete(schema.workRecords).where(eq(schema.workRecords.id, input.id));

            return { success: true };
        }),

    // 作業を開始
    start: protectedProcedure
        .input(
            z.object({
                vehicleId: z.number(),
                processId: z.number(),
                workDescription: z.string().optional(),
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

            // 既に作業中の記録がないか確認
            const activeRecords = await db
                .select()
                .from(schema.workRecords)
                .where(
                    and(
                        eq(schema.workRecords.userId, ctx.user!.id),
                        isNull(schema.workRecords.endTime)
                    )
                );

            if (activeRecords.length > 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "既に作業中の記録があります。先に作業を終了してください。",
                });
            }

            const [result] = await db.insert(schema.workRecords).values({
                userId: ctx.user!.id,
                vehicleId: input.vehicleId,
                processId: input.processId,
                startTime: new Date(),
                endTime: null,
                workDescription: input.workDescription,
            });

            const [inserted] = await db
                .select()
                .from(schema.workRecords)
                .where(eq(schema.workRecords.id, result.insertId))
                .limit(1);

            return {
                id: inserted.id,
                startTime: inserted.startTime,
            };
        }),

    // 作業を終了
    stop: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            // 記録を取得して確認
            const [record] = await db
                .select()
                .from(schema.workRecords)
                .where(eq(schema.workRecords.id, input.id))
                .limit(1);

            if (!record) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "作業記録が見つかりません",
                });
            }

            // 自分の記録か、管理者か確認
            if (record.userId !== ctx.user!.id && ctx.user!.role !== "admin") {
                throw new TRPCError({
                    code: "FORBIDDEN",
                    message: "権限がありません",
                });
            }

            const endTime = new Date();
            const durationMinutes = Math.floor(
                (endTime.getTime() - record.startTime.getTime()) / 1000 / 60
            );

            await db
                .update(schema.workRecords)
                .set({
                    endTime,
                })
                .where(eq(schema.workRecords.id, input.id));

            return {
                id: input.id,
                endTime,
                durationMinutes,
            };
        }),
});

