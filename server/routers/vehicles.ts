import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

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
                category: v.category,
                customerName: v.customerName,
                desiredDeliveryDate: v.desiredDeliveryDate,
                checkDueDate: v.checkDueDate,
                reserveDate: v.reserveDate,
                reserveRound: v.reserveRound,
                hasCoating: v.hasCoating,
                hasLine: v.hasLine,
                hasPreferredNumber: v.hasPreferredNumber,
                hasTireReplacement: v.hasTireReplacement,
                instructionSheetUrl: v.instructionSheetUrl,
                outsourcingDestination: v.outsourcingDestination,
                outsourcingStartDate: v.outsourcingStartDate,
                outsourcingEndDate: v.outsourcingEndDate,
                completionDate: v.completionDate,
                status: v.status,
                targetTotalMinutes: v.targetTotalMinutes,
                processTime: [],
                processTargets: [],
            }));
        }),

    // 車両を作成（全ユーザー可）
    create: protectedProcedure
        .input(
            z.object({
                vehicleNumber: z.string(),
                vehicleTypeId: z.number(),
                category: z.enum(["一般", "キャンパー", "中古", "修理", "クレーム"]).default("一般"),
                customerName: z.string().optional(),
                desiredDeliveryDate: z.date().optional(),
                checkDueDate: z.date().optional(),
                reserveDate: z.date().optional(),
                reserveRound: z.string().optional(),
                hasCoating: z.enum(["yes", "no"]).optional(),
                hasLine: z.enum(["yes", "no"]).optional(),
                hasPreferredNumber: z.enum(["yes", "no"]).optional(),
                hasTireReplacement: z.enum(["summer", "winter", "no"]).optional(),
                instructionSheetUrl: z.string().optional(),
                outsourcingDestination: z.string().optional(),
                outsourcingStartDate: z.date().optional(),
                outsourcingEndDate: z.date().optional(),
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
                category: input.category,
                customerName: input.customerName,
                desiredDeliveryDate: input.desiredDeliveryDate,
                checkDueDate: input.checkDueDate,
                reserveDate: input.reserveDate,
                reserveRound: input.reserveRound,
                hasCoating: input.hasCoating,
                hasLine: input.hasLine,
                hasPreferredNumber: input.hasPreferredNumber,
                hasTireReplacement: input.hasTireReplacement,
                instructionSheetUrl: input.instructionSheetUrl,
                outsourcingDestination: input.outsourcingDestination,
                outsourcingStartDate: input.outsourcingStartDate,
                outsourcingEndDate: input.outsourcingEndDate,
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
                category: z.enum(["一般", "キャンパー", "中古", "修理", "クレーム"]).optional(),
                customerName: z.string().optional(),
                desiredDeliveryDate: z.date().optional(),
                checkDueDate: z.date().optional(),
                reserveDate: z.date().optional(),
                reserveRound: z.string().optional(),
                hasCoating: z.enum(["yes", "no"]).optional(),
                hasLine: z.enum(["yes", "no"]).optional(),
                hasPreferredNumber: z.enum(["yes", "no"]).optional(),
                hasTireReplacement: z.enum(["summer", "winter", "no"]).optional(),
                instructionSheetUrl: z.string().optional(),
                outsourcingDestination: z.string().optional(),
                outsourcingStartDate: z.date().optional(),
                outsourcingEndDate: z.date().optional(),
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

            try {
                const updateData: any = {};
                if (input.vehicleNumber !== undefined) updateData.vehicleNumber = input.vehicleNumber;
                if (input.vehicleTypeId !== undefined) updateData.vehicleTypeId = input.vehicleTypeId;
                if (input.category !== undefined) updateData.category = input.category;
                if (input.customerName !== undefined) updateData.customerName = input.customerName;
                if (input.desiredDeliveryDate !== undefined) {
                    // 日付が有効か確認
                    if (input.desiredDeliveryDate instanceof Date && !isNaN(input.desiredDeliveryDate.getTime())) {
                        updateData.desiredDeliveryDate = input.desiredDeliveryDate;
                    }
                }
                if (input.checkDueDate !== undefined) {
                    // 日付が有効か確認
                    if (input.checkDueDate instanceof Date && !isNaN(input.checkDueDate.getTime())) {
                        updateData.checkDueDate = input.checkDueDate;
                    }
                }
                if (input.reserveDate !== undefined) {
                    if (input.reserveDate instanceof Date && !isNaN(input.reserveDate.getTime())) {
                        updateData.reserveDate = input.reserveDate;
                    }
                }
                if (input.reserveRound !== undefined) updateData.reserveRound = input.reserveRound;
                if (input.hasCoating !== undefined) updateData.hasCoating = input.hasCoating;
                if (input.hasLine !== undefined) updateData.hasLine = input.hasLine;
                if (input.hasPreferredNumber !== undefined) updateData.hasPreferredNumber = input.hasPreferredNumber;
                if (input.hasTireReplacement !== undefined) updateData.hasTireReplacement = input.hasTireReplacement;
                if (input.instructionSheetUrl !== undefined) updateData.instructionSheetUrl = input.instructionSheetUrl;
                if (input.outsourcingDestination !== undefined) updateData.outsourcingDestination = input.outsourcingDestination;
                if (input.outsourcingStartDate !== undefined) {
                    if (input.outsourcingStartDate instanceof Date && !isNaN(input.outsourcingStartDate.getTime())) {
                        updateData.outsourcingStartDate = input.outsourcingStartDate;
                    }
                }
                if (input.outsourcingEndDate !== undefined) {
                    if (input.outsourcingEndDate instanceof Date && !isNaN(input.outsourcingEndDate.getTime())) {
                        updateData.outsourcingEndDate = input.outsourcingEndDate;
                    }
                }
                if (input.targetTotalMinutes !== undefined)
                    updateData.targetTotalMinutes = input.targetTotalMinutes;

                // 更新データが空の場合はエラー
                if (Object.keys(updateData).length === 0) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "更新するデータがありません",
                    });
                }

                await db.update(schema.vehicles).set(updateData).where(eq(schema.vehicles.id, input.id));

                return { success: true };
            } catch (error: any) {
                console.error("[vehicles.update] Error:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "車両の更新に失敗しました",
                });
            }
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

    // 指示書ファイルをアップロード
    uploadInstructionSheet: adminProcedure
        .input(
            z.object({
                vehicleId: z.number(),
                fileData: z.string(), // base64エンコードされたファイルデータ
                fileName: z.string(),
                fileType: z.enum(["image/jpeg", "image/jpg", "application/pdf"]),
            })
        )
        .mutation(async ({ input }) => {
            try {
                // アップロードディレクトリを作成
                const uploadDir = path.resolve(process.cwd(), "uploads", "instruction-sheets");
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // ファイル拡張子を決定
                const extension = input.fileType === "application/pdf" ? "pdf" : "jpg";
                const fileName = `${input.vehicleId}_${nanoid()}.${extension}`;
                const filePath = path.join(uploadDir, fileName);

                // base64データをデコードしてファイルに保存
                const base64Data = input.fileData.replace(/^data:.*,/, "");
                const buffer = Buffer.from(base64Data, "base64");
                fs.writeFileSync(filePath, buffer);

                // ファイルURLを生成（/uploads/instruction-sheets/ファイル名）
                const fileUrl = `/uploads/instruction-sheets/${fileName}`;

                // データベースを更新
                const db = await getDb();
                if (!db) {
                    throw new TRPCError({
                        code: "INTERNAL_SERVER_ERROR",
                        message: "データベースに接続できません",
                    });
                }

                await db
                    .update(schema.vehicles)
                    .set({ instructionSheetUrl: fileUrl })
                    .where(eq(schema.vehicles.id, input.vehicleId));

                return { success: true, fileUrl };
            } catch (error: any) {
                console.error("[vehicles.uploadInstructionSheet] Error:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error.message || "ファイルのアップロードに失敗しました",
                });
            }
        }),

    // 注意ポイントを追加（全ユーザー可、ただし基本的に管理ページから）
    addAttentionPoint: protectedProcedure
        .input(
            z.object({
                vehicleId: z.number(),
                content: z.string().min(1),
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

            await db.insert(schema.vehicleAttentionPoints).values({
                vehicleId: input.vehicleId,
                userId: ctx.user!.id,
                content: input.content,
            });

            return { success: true };
        }),

    // 注意ポイントを取得
    getAttentionPoints: protectedProcedure
        .input(z.object({ vehicleId: z.number() }))
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            const attentionPoints = await db
                .select()
                .from(schema.vehicleAttentionPoints)
                .where(eq(schema.vehicleAttentionPoints.vehicleId, input.vehicleId));

            // ユーザー情報を取得
            const userIds = [...new Set(attentionPoints.map((ap) => ap.userId))];
            let users: any[] = [];
            if (userIds.length > 0) {
                const { inArray } = await import("drizzle-orm");
                users = await db.select().from(schema.users).where(inArray(schema.users.id, userIds));
            }

            const userMap = new Map(users.map((u) => [u.id, u]));

            return attentionPoints.map((ap) => ({
                id: ap.id,
                vehicleId: ap.vehicleId,
                content: ap.content,
                userId: ap.userId,
                userName: userMap.get(ap.userId)?.name || userMap.get(ap.userId)?.username || "不明",
                createdAt: ap.createdAt,
            }));
        }),

    // 注意ポイントを削除（管理者のみ）
    deleteAttentionPoint: adminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            await db.delete(schema.vehicleAttentionPoints).where(eq(schema.vehicleAttentionPoints.id, input.id));

            return { success: true };
        }),
});

