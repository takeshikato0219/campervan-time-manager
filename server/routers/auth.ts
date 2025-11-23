import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../_core/trpc";
import { getUserByUsername } from "../db";
import { setAuthCookie, clearAuthCookie } from "../_core/cookies";

export const authRouter = createTRPCRouter({
    login: publicProcedure
        .input(
            z.object({
                username: z.string(),
                password: z.string(),
            })
        )
        .mutation(async ({ input, ctx }) => {
            try {
                console.log("[Auth] Login attempt:", { username: input.username });

                const user = await getUserByUsername(input.username);
                if (!user) {
                    console.log("[Auth] User not found:", input.username);
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "ユーザー名またはパスワードが正しくありません",
                    });
                }

                console.log("[Auth] User found:", { id: user.id, username: user.username, role: user.role });

                const isValid = await bcrypt.compare(input.password, user.password);
                if (!isValid) {
                    console.log("[Auth] Password mismatch for user:", input.username);
                    throw new TRPCError({
                        code: "UNAUTHORIZED",
                        message: "ユーザー名またはパスワードが正しくありません",
                    });
                }

                console.log("[Auth] Password verified, setting cookie for user:", user.id);

                // JWTトークンをCookieに設定
                await setAuthCookie(ctx.res, user.id);

                console.log("[Auth] Login successful for user:", user.username);

                return {
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        name: user.name,
                        role: user.role,
                    },
                };
            } catch (error) {
                if (error instanceof TRPCError) {
                    throw error;
                }
                console.error("[Auth] Login error:", error);
                throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: error instanceof Error ? error.message : "ログイン処理中にエラーが発生しました",
                });
            }
        }),

    me: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.user) {
            return null;
        }

        return {
            id: ctx.user.id,
            username: ctx.user.username,
            name: ctx.user.name,
            role: ctx.user.role,
        };
    }),

    logout: publicProcedure.mutation(async ({ ctx }) => {
        clearAuthCookie(ctx.res);
        return { success: true };
    }),
});

