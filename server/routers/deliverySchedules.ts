import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure, subAdminProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { and, gte, lte, eq, or, isNull } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";

// 指定年月の開始日と終了日を取得
function getMonthRange(year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0); // 翌月0日 = 当月末
    return { start, end };
}

// 遅れ日数を計算（今日 - 納期）。未来の場合は 0。
function calcDelayDays(dueDate: Date | null): number {
    if (!dueDate) return 0;
    const today = new Date();
    const d = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffMs = t.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
}

export const deliverySchedulesRouter = createTRPCRouter({
    // 公開（パスワードなし）用の一覧取得
    publicList: publicProcedure
        .input(
            z.object({
                year: z.number(),
                month: z.number().min(1).max(12),
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

            const { start, end } = getMonthRange(input.year, input.month);

            const records = await db
                .select()
                .from(schema.deliverySchedules)
                .where(
                    or(
                        and(
                            gte(schema.deliverySchedules.deliveryPlannedDate, start),
                            lte(schema.deliverySchedules.deliveryPlannedDate, end)
                        ),
                        and(
                            isNull(schema.deliverySchedules.deliveryPlannedDate),
                            gte(schema.deliverySchedules.dueDate, start),
                            lte(schema.deliverySchedules.dueDate, end)
                        )
                    )
                );

            return records.map((r) => ({
                ...r,
                delayDays: calcDelayDays(r.dueDate),
            }));
        }),

    // アプリ側（ログイン後）の一覧取得
    list: protectedProcedure
        .input(
            z.object({
                year: z.number(),
                month: z.number().min(1).max(12),
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

            const { start, end } = getMonthRange(input.year, input.month);

            const records = await db
                .select()
                .from(schema.deliverySchedules)
                .where(
                    or(
                        and(
                            gte(schema.deliverySchedules.deliveryPlannedDate, start),
                            lte(schema.deliverySchedules.deliveryPlannedDate, end)
                        ),
                        and(
                            isNull(schema.deliverySchedules.deliveryPlannedDate),
                            gte(schema.deliverySchedules.dueDate, start),
                            lte(schema.deliverySchedules.dueDate, end)
                        )
                    )
                );

            return records.map((r) => ({
                ...r,
                delayDays: calcDelayDays(r.dueDate),
            }));
        }),

    // 1件取得
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

            const [record] = await db
                .select()
                .from(schema.deliverySchedules)
                .where(eq(schema.deliverySchedules.id, input.id))
                .limit(1);

            if (!record) {
                throw new TRPCError({
                    code: "NOT_FOUND",
                    message: "レコードが見つかりません",
                });
            }

            return {
                ...record,
                delayDays: calcDelayDays(record.dueDate),
            };
        }),

    // 作成（準管理者以上）
    create: subAdminProcedure
        .input(
            z.object({
                vehicleName: z.string(),
                vehicleType: z.string().optional(),
                customerName: z.string().optional(),
                optionName: z.string().optional(),
                optionCategory: z.string().optional(),
                prefecture: z.string().optional(),
                baseCarReady: z.enum(["yes", "no"]).optional(),
                furnitureReady: z.enum(["yes", "no"]).optional(),
                inCharge: z.string().optional(),
                dueDate: z.string().optional(), // yyyy-MM-dd（ワングラム入庫予定）
                incomingPlannedDate: z.string().optional(),
                shippingPlannedDate: z.string().optional(),
                deliveryPlannedDate: z.string().optional(),
                comment: z.string().optional(),
                claimComment: z.string().optional(),
                photosJson: z.string().optional(),
                oemComment: z.string().optional(),
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

            const parseDate = (value?: string) => {
                if (!value) return null;
                const d = new Date(value);
                return isNaN(d.getTime()) ? null : d;
            };

            await db.insert(schema.deliverySchedules).values({
                vehicleName: input.vehicleName,
                vehicleType: input.vehicleType,
                customerName: input.customerName,
                optionName: input.optionName,
                optionCategory: input.optionCategory,
                prefecture: input.prefecture,
                baseCarReady: input.baseCarReady,
                furnitureReady: input.furnitureReady,
                inCharge: input.inCharge,
                dueDate: parseDate(input.dueDate) as any,
                incomingPlannedDate: parseDate(input.incomingPlannedDate) as any,
                shippingPlannedDate: parseDate(input.shippingPlannedDate) as any,
                deliveryPlannedDate: parseDate(input.deliveryPlannedDate) as any,
                comment: input.comment,
                claimComment: input.claimComment,
                photosJson: input.photosJson,
                oemComment: input.oemComment,
            });

            return { success: true };
        }),

    // 更新（準管理者以上）
    update: subAdminProcedure
        .input(
            z.object({
                id: z.number(),
                vehicleName: z.string().optional(),
                vehicleType: z.string().optional(),
                customerName: z.string().optional(),
                optionName: z.string().optional(),
                optionCategory: z.string().optional(),
                prefecture: z.string().optional(),
                baseCarReady: z.enum(["yes", "no"]).optional(),
                furnitureReady: z.enum(["yes", "no"]).optional(),
                inCharge: z.string().optional(),
                dueDate: z.string().optional(),
                incomingPlannedDate: z.string().optional(),
                shippingPlannedDate: z.string().optional(),
                deliveryPlannedDate: z.string().optional(),
                comment: z.string().optional(),
                claimComment: z.string().optional(),
                photosJson: z.string().optional(),
                oemComment: z.string().optional(),
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

            const parseDate = (value?: string) => {
                if (!value) return undefined;
                const d = new Date(value);
                return isNaN(d.getTime()) ? undefined : (d as any);
            };

            const updateData: any = {};
            if (input.vehicleName !== undefined) updateData.vehicleName = input.vehicleName;
            if (input.vehicleType !== undefined) updateData.vehicleType = input.vehicleType;
            if (input.customerName !== undefined) updateData.customerName = input.customerName;
            if (input.optionName !== undefined) updateData.optionName = input.optionName;
            if (input.optionCategory !== undefined) updateData.optionCategory = input.optionCategory;
            if (input.prefecture !== undefined) updateData.prefecture = input.prefecture;
            if (input.baseCarReady !== undefined) updateData.baseCarReady = input.baseCarReady;
            if (input.furnitureReady !== undefined) updateData.furnitureReady = input.furnitureReady;
            if (input.inCharge !== undefined) updateData.inCharge = input.inCharge;

            const due = parseDate(input.dueDate);
            if (input.dueDate !== undefined) updateData.dueDate = due ?? null;
            const incoming = parseDate(input.incomingPlannedDate);
            if (input.incomingPlannedDate !== undefined)
                updateData.incomingPlannedDate = incoming ?? null;
            const shipping = parseDate(input.shippingPlannedDate);
            if (input.shippingPlannedDate !== undefined)
                updateData.shippingPlannedDate = shipping ?? null;
            const delivery = parseDate(input.deliveryPlannedDate);
            if (input.deliveryPlannedDate !== undefined)
                updateData.deliveryPlannedDate = delivery ?? null;

            if (input.comment !== undefined) updateData.comment = input.comment;
            if (input.claimComment !== undefined) updateData.claimComment = input.claimComment;
            if (input.photosJson !== undefined) updateData.photosJson = input.photosJson;
            if (input.oemComment !== undefined) updateData.oemComment = input.oemComment;

            await db
                .update(schema.deliverySchedules)
                .set(updateData)
                .where(eq(schema.deliverySchedules.id, input.id));

            return { success: true };
        }),

    // 削除（準管理者以上）
    delete: subAdminProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            await db.delete(schema.deliverySchedules).where(eq(schema.deliverySchedules.id, input.id));

            return { success: true };
        }),

    // 引き取り予定日を確定（準管理者以上）
    confirmPickup: subAdminProcedure
        .input(z.object({ id: z.number(), confirmed: z.boolean() }))
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: "データベースに接続できません",
                });
            }

            await db
                .update(schema.deliverySchedules)
                .set({ pickupConfirmed: input.confirmed ? "true" : "false" } as any)
                .where(eq(schema.deliverySchedules.id, input.id));

            if (input.confirmed) {
                // 通知対象: 管理者・準管理者全員 + 名前に「鈴木」を含むユーザー
                const admins = await db
                    .select()
                    .from(schema.users)
                    .where(
                        or(
                            eq(schema.users.role, "admin" as any),
                            eq(schema.users.role, "sub_admin" as any)
                        )
                    );

                const { like } = await import("drizzle-orm");
                const suzukiUsers = await db
                    .select()
                    .from(schema.users)
                    .where(like(schema.users.name, "%鈴木%"))
                    .limit(5);

                const targets = [...admins, ...suzukiUsers];
                const uniqueUserIds = Array.from(new Set(targets.map((u) => u.id)));

                // 対象の納車スケジュール情報を取得
                const [schedule] = await db
                    .select()
                    .from(schema.deliverySchedules)
                    .where(eq(schema.deliverySchedules.id, input.id))
                    .limit(1);

                const title = "引き取り予定日が確定しました";
                const baseName = schedule?.vehicleName || "納車スケジュール";
                const message = `${baseName} の引き取り予定日が確定しました。`;

                if (uniqueUserIds.length > 0) {
                    await db.insert(schema.notifications).values(
                        uniqueUserIds.map((userId) => ({
                            userId,
                            title,
                            message,
                            type: "info" as any,
                        }))
                    );
                }
            }

            return { success: true };
        }),

    // 製造注意仕様書をアップロード（準管理者以上）
    uploadSpecSheet: subAdminProcedure
        .input(
            z.object({
                id: z.number(),
                fileData: z.string(), // base64
                fileName: z.string(),
                fileType: z.enum(["image/jpeg", "image/jpg", "application/pdf"]),
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

            // ディレクトリ作成
            const uploadDir = path.resolve(process.cwd(), "uploads", "delivery-specs");
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const extension = input.fileType === "application/pdf" ? "pdf" : "jpg";
            const fileName = `${input.id}_${nanoid()}.${extension}`;
            const filePath = path.join(uploadDir, fileName);

            const base64Data = input.fileData.replace(/^data:.*,/, "");
            const buffer = Buffer.from(base64Data, "base64");
            fs.writeFileSync(filePath, buffer);

            const fileUrl = `/uploads/delivery-specs/${fileName}`;

            await db
                .update(schema.deliverySchedules)
                .set({ specSheetUrl: fileUrl } as any)
                .where(eq(schema.deliverySchedules.id, input.id));

            return { success: true, fileUrl };
        }),
});


