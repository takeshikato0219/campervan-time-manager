import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { eq } from "drizzle-orm";

export const vehiclesRouter = createTRPCRouter({
    // 車両一覧を取得
    list: protectedProcedure
        .input(
            z.object({
                status: z.enum(["in_progress", "completed", "archived"]).optional(),
                sinceYesterday: z.boolean().optional().default(false),
            })
        )
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                return [];
            }

            let vehicles;
            if (input.status) {
                vehicles = await db
                    .select()
                    .from(schema.vehicles)
                    .where(eq(schema.vehicles.status, input.status));
            } else {
                vehicles = await db.select().from(schema.vehicles);
            }

            return vehicles.map((v) => ({
                id: v.id,
                vehicleNumber: v.vehicleNumber,
                vehicleTypeId: v.vehicleTypeId,
                customerName: v.customerName,
                desiredDeliveryDate: v.desiredDeliveryDate,
                completionDate: v.completionDate,
                status: v.status,
                targetTotalMinutes: v.targetTotalMinutes,
                processTime: [],
                processTargets: [],
            }));
        }),

    // 車両を作成（管理者専用）
    create: adminProcedure
        .input(
            z.object({
                vehicleNumber: z.string(),
                vehicleTypeId: z.number(),
                customerName: z.string().optional(),
                desiredDeliveryDate: z.date().optional(),
                targetTotalMinutes: z.number().optional(),
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

            await db.insert(schema.vehicles).values({
                vehicleNumber: input.vehicleNumber,
                vehicleTypeId: input.vehicleTypeId,
                customerName: input.customerName,
                desiredDeliveryDate: input.desiredDeliveryDate,
                targetTotalMinutes: input.targetTotalMinutes,
            });

            // 挿入されたレコードを取得
            const [inserted] = await db
                .select()
                .from(schema.vehicles)
                .where(eq(schema.vehicles.vehicleNumber, input.vehicleNumber))
                .limit(1);

            return {
                id: inserted.id,
            };
        }),

    // 車両を更新（管理者専用）
    update: adminProcedure
        .input(
            z.object({
                id: z.number(),
                vehicleNumber: z.string().optional(),
                vehicleTypeId: z.number().optional(),
                customerName: z.string().optional(),
                desiredDeliveryDate: z.date().optional(),
                targetTotalMinutes: z.number().optional(),
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
            if (input.vehicleNumber !== undefined) updateData.vehicleNumber = input.vehicleNumber;
            if (input.vehicleTypeId !== undefined) updateData.vehicleTypeId = input.vehicleTypeId;
            if (input.customerName !== undefined) updateData.customerName = input.customerName;
            if (input.desiredDeliveryDate !== undefined)
                updateData.desiredDeliveryDate = input.desiredDeliveryDate;
            if (input.targetTotalMinutes !== undefined)
                updateData.targetTotalMinutes = input.targetTotalMinutes;

            await db.update(schema.vehicles).set(updateData).where(eq(schema.vehicles.id, input.id));

            return { success: true };
        }),

    // 車両詳細を取得
    get: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            const [vehicle] = await db
                .select()
                .from(schema.vehicles)
                .where(eq(schema.vehicles.id, input.id))
                .limit(1);

            if (!vehicle) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "車両が見つかりません",
                });
            }

            // 作業記録を取得
            const workRecords = await db
                .select()
                .from(schema.workRecords)
                .where(eq(schema.workRecords.vehicleId, input.id))
                .orderBy(schema.workRecords.startTime);

            // ユーザー、工程情報を取得
            const users = await db.select().from(schema.users);
            const processes = await db.select().from(schema.processes);
            const userMap = new Map(users.map((u) => [u.id, u]));
            const processMap = new Map(processes.map((p) => [p.id, p]));

            // メモを取得
            const memos = await db
                .select()
                .from(schema.vehicleMemos)
                .where(eq(schema.vehicleMemos.vehicleId, input.id))
                .orderBy(schema.vehicleMemos.createdAt);

            // 工程別作業時間を集計
            const processTimeMap = new Map<number, number>();
            workRecords.forEach((wr) => {
                if (wr.endTime) {
                    const minutes = Math.floor(
                        (wr.endTime.getTime() - wr.startTime.getTime()) / 1000 / 60
                    );
                    const current = processTimeMap.get(wr.processId) || 0;
                    processTimeMap.set(wr.processId, current + minutes);
                }
            });

            const processTime = Array.from(processTimeMap.entries()).map(([processId, minutes]) => ({
                processId,
                processName: processMap.get(processId)?.name || "不明",
                minutes,
            }));

            return {
                ...vehicle,
                workRecords: workRecords.map((wr) => ({
                    id: wr.id,
                    userId: wr.userId,
                    userName: userMap.get(wr.userId)?.name || userMap.get(wr.userId)?.username || "不明",
                    processId: wr.processId,
                    processName: processMap.get(wr.processId)?.name || "不明",
                    startTime: wr.startTime,
                    endTime: wr.endTime,
                    durationMinutes: wr.endTime
                        ? Math.floor((wr.endTime.getTime() - wr.startTime.getTime()) / 1000 / 60)
                        : null,
                    workDescription: wr.workDescription,
                })),
                memos: memos.map((m) => ({
                    id: m.id,
                    userId: m.userId,
                    userName: userMap.get(m.userId)?.name || userMap.get(m.userId)?.username || "不明",
                    content: m.content,
                    createdAt: m.createdAt,
                })),
                processTime,
            };
        }),

    // 車両を削除（管理者専用）
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

            await db.delete(schema.vehicles).where(eq(schema.vehicles.id, input.id));

            return { success: true };
        }),

    // 車両を完成にする（管理者専用）
    complete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            await db
                .update(schema.vehicles)
                .set({
                    status: "completed",
                    completionDate: new Date(),
                })
                .where(eq(schema.vehicles.id, input.id));

            return { success: true };
        }),

    // 車両を保管する（管理者専用）
    archive: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            await db
                .update(schema.vehicles)
                .set({
                    status: "archived",
                })
                .where(eq(schema.vehicles.id, input.id));

            return { success: true };
        }),

    // 車両を作業中に戻す（管理者専用）
    uncomplete: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            await db
                .update(schema.vehicles)
                .set({
                    status: "in_progress",
                    completionDate: null,
                })
                .where(eq(schema.vehicles.id, input.id));

            return { success: true };
        }),

    // 車両を完成に戻す（管理者専用）
    unarchive: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            await db
                .update(schema.vehicles)
                .set({
                    status: "completed",
                })
                .where(eq(schema.vehicles.id, input.id));

            return { success: true };
        }),
});

