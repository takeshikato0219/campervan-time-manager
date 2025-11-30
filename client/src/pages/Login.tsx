import React, { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { toast } from "sonner";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const loginMutation = trpc.auth.login.useMutation({
        onSuccess: (data) => {
            console.log("Login success:", data);
            toast.success("ログインしました");
            // 少し待ってからリロード（Cookieが設定されるのを待つ）
            setTimeout(() => {
                // ワングラムアカウント（externalロール）の場合は納車スケジュールページへ
                if (data.user?.role === "external") {
                    window.location.href = "/delivery-schedules";
                } else {
                    window.location.href = "/"; // ページリロードで認証状態を更新
                }
            }, 100);
        },
        onError: (error) => {
            console.error("Login error:", error);
            console.error("Error details:", {
                message: error.message,
                code: error.data?.code,
                httpStatus: error.data?.httpStatus,
            });
            toast.error(error.message || "ログインに失敗しました");
            setIsLoading(false);
        },
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || !password) {
            toast.error("ユーザー名とパスワードを入力してください");
            return;
        }

        setIsLoading(true);
        loginMutation.mutate({ username, password });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleSubmit(e as any);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>ログイン</CardTitle>
                    <CardDescription>キャンピングカー架装時間管理システム</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="username" className="text-sm font-medium">
                                ログインID
                            </label>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="ユーザー名を入力"
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">
                                パスワード
                            </label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="パスワードを入力"
                                disabled={isLoading}
                                required
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={isLoading}>
                            {isLoading ? "ログイン中..." : "ログイン"}
                        </Button>
                    </form>

                    <div className="mt-6 flex justify-center">
                        <img 
                            src="/katomotor.png" 
                            alt="Kato Motor" 
                            className="max-w-full h-auto max-h-32 object-contain"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

