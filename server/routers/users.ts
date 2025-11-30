import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, adminProcedure, subAdminProcedure } from "../_core/trpc";
import { getDb, getPool, schema } from "../db";
import { eq } from "drizzle-orm";

export const usersRouter = createTRPCRouter({
    // 全ユーザー一覧を取得（管理者専用）
    list: adminProcedure.query(async () => {
        const db = await getDb();
        if (!db) {
            return [];
        }

        try {
            const { selectUsersSafely } = await import("../db");
            const users = await selectUsersSafely(db);

            // createdAtでソート（存在する場合）
            return users.sort((a: any, b: any) => {
                if (a.id && b.id) {
                    return a.id - b.id;
                }
                return 0;
            });
        } catch (error: any) {
            console.error("[Users] List error:", error);
            return [];
        }
    }),

    // ユーザーを作成（管理者専用）
    create: adminProcedure
        .input(
            z.object({
                username: z.string(),
                password: z.string(),
                name: z.string().optional(), // 表示名（社員名）
                role: z.enum(["field_worker", "sales_office", "sub_admin", "admin", "external"]).default("field_worker"),
                category: z.preprocess(
                    (val) => {
                        // 空文字列、undefined、または無効な値の場合はnull
                        if (!val || val === "" || (val !== "elephant" && val !== "squirrel")) {
                            return null;
                        }
                        return val;
                    },
                    z.enum(["elephant", "squirrel"]).nullable().optional()
                ),
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

            // categoryの値を決定
            // externalロールの場合はcategoryを送信しない（undefinedにする）
            // それ以外で有効な値の場合はその値を使用、無効な値の場合はundefined
            let categoryValue: "elephant" | "squirrel" | undefined = undefined;
            if (input.role !== "external") {
                const category = input.category;
                if (category === "elephant" || category === "squirrel") {
                    categoryValue = category;
                }
            }

            // categoryがundefinedの場合は、データベースに送信しない
            // externalロールの場合は生SQLを使用してcategoryを除外
            if (input.role === "external" || categoryValue === undefined) {
                const pool = getPool();
                if (pool) {
                    await pool.execute(
                        `INSERT INTO \`users\` (\`username\`, \`password\`, \`name\`, \`role\`, \`createdAt\`, \`updatedAt\`) VALUES (?, ?, ?, ?, NOW(), NOW())`,
                        [
                            input.username,
                            hashedPassword,
                            input.name || null,
                            input.role,
                        ]
                    );
                } else {
                    // poolが取得できない場合は通常の方法を使用（categoryをnullに）
                    await db.insert(schema.users).values({
                        username: input.username,
                        password: hashedPassword,
                        name: input.name || null,
                        role: input.role,
                        category: null,
                    });
                }
            } else {
                // categoryがある場合は通常の方法を使用
                await db.insert(schema.users).values({
                    username: input.username,
                    password: hashedPassword,
                    name: input.name || null,
                    role: input.role,
                    category: categoryValue,
                });
            }

            return { success: true };
        }),

    // ユーザーを更新（管理者専用）
    update: adminProcedure
        .input(
            z.object({
                id: z.number(),
                username: z.string().optional(),
                password: z.string().optional(),
                name: z.string().optional(), // 表示名（社員名）
                role: z.enum(["field_worker", "sales_office", "sub_admin", "admin", "external"]).optional(),
                category: z.preprocess(
                    (val) => {
                        // 空文字列、undefined、または無効な値の場合はnull
                        if (!val || val === "" || (val !== "elephant" && val !== "squirrel")) {
                            return null;
                        }
                        return val;
                    },
                    z.enum(["elephant", "squirrel"]).nullable().optional()
                ),
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

            // ユーザー名の重複チェック（変更する場合）
            if (input.username !== undefined) {
                const existing = await db
                    .select({ id: schema.users.id, username: schema.users.username })
                    .from(schema.users)
                    .where(eq(schema.users.username, input.username))
                    .limit(1);

                if (existing.length > 0 && existing[0].id !== input.id) {
                    throw new TRPCError({
                        code: "BAD_REQUEST",
                        message: "このユーザー名は既に使用されています",
                    });
                }
            }

            const updateData: any = {};
            if (input.username !== undefined) updateData.username = input.username;
            if (input.password !== undefined) {
                updateData.password = await bcrypt.hash(input.password, 10);
            }
            if (input.name !== undefined) updateData.name = input.name;
            if (input.role !== undefined) updateData.role = input.role;
            // categoryの処理: externalロールの場合はcategoryを送信しない
            if (input.category !== undefined) {
                if (input.role === "external") {
                    // externalロールの場合はcategoryを送信しない（undefinedのまま）
                } else {
                    // 有効な値の場合のみ設定
                    if (input.category === "elephant" || input.category === "squirrel") {
                        updateData.category = input.category;
                    }
                    // nullや無効な値の場合はundefinedのまま（データベースに送信しない）
                }
            }

            if (Object.keys(updateData).length > 0) {
                await db.update(schema.users).set(updateData).where(eq(schema.users.id, input.id));
            }

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

