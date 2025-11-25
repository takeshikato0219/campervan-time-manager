import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, adminProcedure, subAdminProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { eq } from "drizzle-orm";

export const usersRouter = createTRPCRouter({
    // 全ユーザー一覧を取得（準管理者以上）
    list: subAdminProcedure.query(async () => {
        const db = await getDb();
        if (!db) {
            return [];
        }

        try {
            const users = await db
                .select({
                    id: schema.users.id,
                    username: schema.users.username,
                    name: schema.users.name,
                    role: schema.users.role,
                    category: schema.users.category,
                    createdAt: schema.users.createdAt,
                })
                .from(schema.users)
                .orderBy(schema.users.id);

            return users;
        } catch (error: any) {
            // nameまたはcategoryカラムが存在しない場合は、基本カラムのみで取得
            if (error?.message?.includes("category") || error?.message?.includes("name") || error?.code === "ER_BAD_FIELD_ERROR") {
                try {
                    const users = await db
                        .select({
                            id: schema.users.id,
                            username: schema.users.username,
                            role: schema.users.role,
                            createdAt: schema.users.createdAt,
                        })
                        .from(schema.users)
                        .orderBy(schema.users.id);

                    return users.map((u) => ({ ...u, name: null, category: null }));
                } catch (innerError: any) {
                    // それでもエラーが発生する場合は、最小限のカラムのみで取得
                    const users = await db
                        .select({
                            id: schema.users.id,
                            username: schema.users.username,
                            role: schema.users.role,
                        })
                        .from(schema.users)
                        .orderBy(schema.users.id);

                    return users.map((u) => ({ ...u, name: null, category: null, createdAt: null }));
                }
            }
            throw error;
        }
    }),

    // ユーザーを作成（管理者専用）
    create: adminProcedure
        .input(
            z.object({
                username: z.string(),
                password: z.string(),
                name: z.string().optional(),
                role: z.enum(["field_worker", "sales_office", "sub_admin", "admin"]).default("field_worker"),
                category: z.enum(["elephant", "squirrel"]).optional(),
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

            // ユーザー名の重複チェック
            const existing = await db
                .select()
                .from(schema.users)
                .where(eq(schema.users.username, input.username))
                .limit(1);

            if (existing.length > 0) {
                throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "このユーザー名は既に使用されています",
                });
            }

            const hashedPassword = await bcrypt.hash(input.password, 10);

            await db.insert(schema.users).values({
                username: input.username,
                password: hashedPassword,
                name: input.name,
                role: input.role,
                category: input.category || null,
            });

            return { success: true };
        }),

    // ユーザーを更新（管理者専用）
    update: adminProcedure
        .input(
            z.object({
                id: z.number(),
                username: z.string().optional(),
                password: z.string().optional(),
                name: z.string().optional(),
                role: z.enum(["field_worker", "sales_office", "sub_admin", "admin"]).optional(),
                category: z.enum(["elephant", "squirrel"]).optional().nullable(),
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
            if (input.username !== undefined) updateData.username = input.username;
            if (input.password !== undefined) {
                updateData.password = await bcrypt.hash(input.password, 10);
            }
            if (input.name !== undefined) updateData.name = input.name;
            if (input.role !== undefined) updateData.role = input.role;
            if (input.category !== undefined) updateData.category = input.category;

            await db.update(schema.users).set(updateData).where(eq(schema.users.id, input.id));

            return { success: true };
        }),

    // ユーザーを削除（管理者専用）
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

            await db.delete(schema.users).where(eq(schema.users.id, input.id));

            return { success: true };
        }),
});

