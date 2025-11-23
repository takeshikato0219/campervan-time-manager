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
                window.location.href = "/"; // ページリロードで認証状態を更新
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

                    <div className="mt-6 p-4 bg-[hsl(var(--muted))] rounded-lg text-sm space-y-3">
                        <div>
                            <p className="font-semibold mb-2">初期アカウント情報:</p>
                            <p className="mb-1">
                                <strong>管理者:</strong> admin / admin123
                            </p>
                            <p>
                                <strong>スタッフ:</strong> user001～user040 / password
                            </p>
                        </div>
                        <div className="pt-3 border-t border-[hsl(var(--border))]">
                            <p className="font-semibold mb-2 text-amber-600">⚠️ データベース設定が必要です</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                ログインするには、.envファイルにDATABASE_URLを設定し、データベースをセットアップしてください。
                                詳細は SETUP_DATABASE.md を参照してください。
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

