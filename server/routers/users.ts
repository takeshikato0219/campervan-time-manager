import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { createTRPCRouter, adminProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { eq } from "drizzle-orm";

export const usersRouter = createTRPCRouter({
    // 全ユーザー一覧を取得（管理者専用）
    list: adminProcedure.query(async () => {
        const db = await getDb();
        if (!db) {
            return [];
        }

        const users = await db
            .select({
                id: schema.users.id,
                username: schema.users.username,
                name: schema.users.name,
                role: schema.users.role,
                createdAt: schema.users.createdAt,
            })
            .from(schema.users)
            .orderBy(schema.users.id);

        return users;
    }),

    // ユーザーを作成（管理者専用）
    create: adminProcedure
        .input(
            z.object({
                username: z.string(),
                password: z.string(),
                name: z.string().optional(),
                role: z.enum(["user", "admin"]).default("user"),
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
                role: z.enum(["user", "admin"]).optional(),
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

