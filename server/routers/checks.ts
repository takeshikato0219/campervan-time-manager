import { createTRPCRouter, adminProcedure, protectedProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const checksRouter = createTRPCRouter({
    // チェック項目一覧取得（区分別）
    listCheckItems: protectedProcedure
        .input(
            z.object({
                category: z.enum(["一般", "キャンパー", "中古", "修理", "クレーム"]).optional(),
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

            let query = db.select().from(schema.checkItems);
            if (input.category) {
                query = query.where(eq(schema.checkItems.category, input.category)) as any;
            }

            const items = await query;
            return items.sort((a, b) => {
                const orderA = a.displayOrder ?? 0;
                const orderB = b.displayOrder ?? 0;
                return orderA - orderB;
            });
        }),

    // チェック項目作成（管理者のみ）
    createCheckItem: adminProcedure
        .input(
            z.object({
                category: z.enum(["一般", "キャンパー", "中古", "修理", "クレーム"]),
                name: z.string().min(1),
                description: z.string().optional(),
                displayOrder: z.number().default(0),
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

            const [result] = await db.insert(schema.checkItems).values(input).$returningId();
            return { id: result };
        }),

    // チェック項目更新（管理者のみ）
    updateCheckItem: adminProcedure
        .input(
            z.object({
                id: z.number(),
                name: z.string().min(1).optional(),
                description: z.string().optional(),
                displayOrder: z.number().optional(),
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

            const { id, ...updateData } = input;
            await db.update(schema.checkItems).set(updateData).where(eq(schema.checkItems.id, id));
            return { success: true };
        }),

    // チェック項目削除（管理者のみ）
    deleteCheckItem: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            await db.delete(schema.checkItems).where(eq(schema.checkItems.id, input.id));
            return { success: true };
        }),

    // 車両のチェック状況取得
    getVehicleChecks: protectedProcedure
        .input(z.object({ vehicleId: z.number() }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            // 車両情報を取得
            const [vehicle] = await db
                .select()
                .from(schema.vehicles)
                .where(eq(schema.vehicles.id, input.vehicleId))
                .limit(1);

            if (!vehicle) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "車両が見つかりません",
                });
            }

            // 該当区分のチェック項目を取得
            const checkItems = await db
                .select()
                .from(schema.checkItems)
                .where(eq(schema.checkItems.category, vehicle.category as any));

            // 表示順でソート
            checkItems.sort((a, b) => {
                const orderA = a.displayOrder ?? 0;
                const orderB = b.displayOrder ?? 0;
                return orderA - orderB;
            });

            // チェック記録を取得
            const checks = await db
                .select()
                .from(schema.vehicleChecks)
                .where(eq(schema.vehicleChecks.vehicleId, input.vehicleId));

            // ユーザー情報を取得
            const userIds = [...new Set(checks.map((c) => c.checkedBy))];
            let users: any[] = [];
            if (userIds.length > 0) {
                const { inArray } = await import("drizzle-orm");
                users = await db.select().from(schema.users).where(inArray(schema.users.id, userIds));
            }

            const userMap = new Map(users.map((u) => [u.id, u]));

            // チェック項目ごとにチェック状況を整理
            const checkStatus = checkItems.map((item) => {
                const check = checks.find((c) => c.checkItemId === item.id);
                return {
                    checkItem: item,
                    checked: check ? true : false,
                    checkedBy: check ? userMap.get(check.checkedBy) : null,
                    checkedAt: check ? check.checkedAt : null,
                    notes: check ? check.notes : null,
                };
            });

            return {
                vehicle,
                checkStatus,
            };
        }),

    // チェック実行
    checkVehicle: protectedProcedure
        .input(
            z.object({
                vehicleId: z.number(),
                checkItemId: z.number(),
                notes: z.string().optional(),
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

            // 既存のチェック記録を確認
            const existingChecks = await db
                .select()
                .from(schema.vehicleChecks)
                .where(
                    and(
                        eq(schema.vehicleChecks.vehicleId, input.vehicleId),
                        eq(schema.vehicleChecks.checkItemId, input.checkItemId)
                    )
                );

            if (existingChecks.length > 0) {
                // 既存のチェックを更新
                await db
                    .update(schema.vehicleChecks)
                    .set({
                        checkedBy: ctx.user!.id,
                        notes: input.notes || null,
                        checkedAt: new Date(),
                    })
                    .where(eq(schema.vehicleChecks.id, existingChecks[0].id));
            } else {
                // 新規チェックを作成
                await db.insert(schema.vehicleChecks).values({
                    vehicleId: input.vehicleId,
                    checkItemId: input.checkItemId,
                    checkedBy: ctx.user!.id,
                    notes: input.notes || null,
                });
            }

            return { success: true };
        }),

    // チェック依頼作成
    requestCheck: protectedProcedure
        .input(
            z.object({
                vehicleId: z.number(),
                requestedTo: z.number(), // 依頼先ユーザーID
                message: z.string().optional(),
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

            await db.insert(schema.checkRequests).values({
                vehicleId: input.vehicleId,
                requestedBy: ctx.user!.id,
                requestedTo: input.requestedTo,
                message: input.message || null,
                status: "pending",
            });

            return { success: true };
        }),

    // チェック依頼一覧取得（自分宛の依頼）
    getMyCheckRequests: protectedProcedure.query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "データベースに接続できません",
            });
        }

        const requests = await db
            .select()
            .from(schema.checkRequests)
            .where(eq(schema.checkRequests.requestedTo, ctx.user!.id));

        // ユーザー情報と車両情報を取得
        const userIds = [...new Set([...requests.map((r) => r.requestedBy), ...requests.map((r) => r.requestedTo)])];
        const vehicleIds = [...new Set(requests.map((r) => r.vehicleId))];

        let users: any[] = [];
        let vehicles: any[] = [];
        if (userIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            users = await db.select().from(schema.users).where(inArray(schema.users.id, userIds));
        }
        if (vehicleIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            vehicles = await db.select().from(schema.vehicles).where(inArray(schema.vehicles.id, vehicleIds));
        }

        const userMap = new Map(users.map((u) => [u.id, u]));
        const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

        return requests.map((request) => ({
            ...request,
            requestedByUser: userMap.get(request.requestedBy),
            vehicle: vehicleMap.get(request.vehicleId),
        }));
    }),

    // チェック依頼完了
    completeCheckRequest: protectedProcedure
        .input(z.object({ requestId: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            await db
                .update(schema.checkRequests)
                .set({
                    status: "completed",
                    completedAt: new Date(),
                })
                .where(eq(schema.checkRequests.id, input.requestId));

            return { success: true };
        }),
});

