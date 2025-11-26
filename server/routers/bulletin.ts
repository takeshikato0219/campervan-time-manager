import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { desc, lt } from "drizzle-orm";

export const bulletinRouter = createTRPCRouter({
    // 掲示板メッセージ作成（全ユーザー利用可）
    create: protectedProcedure
        .input(
            z.object({
                message: z.string().min(1).max(500),
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

            const [result] = await db
                .insert(schema.bulletinMessages)
                .values({
                    userId: ctx.user!.id,
                    message: input.message,
                })
                .$returningId();

            return { id: result };
        }),

    // 最新の掲示板メッセージを取得（上位20件）
    list: protectedProcedure.query(async () => {
        const db = await getDb();
        if (!db) {
            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "データベースに接続できません",
            });
        }

        // 5日より前のメッセージは自動的に削除
        const now = new Date();
        const threshold = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
        try {
            await db
                .delete(schema.bulletinMessages)
                .where(lt(schema.bulletinMessages.createdAt, threshold));
        } catch (error) {
            console.error("[bulletin.list] 古いメッセージの削除に失敗しました:", error);
        }

        const messages = await db
            .select()
            .from(schema.bulletinMessages)
            .orderBy(desc(schema.bulletinMessages.createdAt))
            .limit(20);

        // 投稿者情報を取得
        const userIds = [...new Set(messages.map((m) => m.userId))];
        let users: any[] = [];
        if (userIds.length > 0) {
            const { inArray } = await import("drizzle-orm");
            const { selectUsersSafely } = await import("../db");
            users = await selectUsersSafely(db, inArray(schema.users.id, userIds));
        }
        const userMap = new Map(users.map((u) => [u.id, u]));

        return messages.map((m) => ({
            ...m,
            user: userMap.get(m.userId) || null,
        }));
    }),
});


