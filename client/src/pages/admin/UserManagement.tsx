import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { trpc } from "../../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";

export default function UserManagement() {
    const { user } = useAuth();

    // 管理者のみアクセス可能
    if (user?.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <p className="text-lg font-semibold">アクセス権限がありません</p>
                    <p className="text-[hsl(var(--muted-foreground))] mt-2">
                        このページは管理者のみがアクセスできます
                    </p>
                </div>
            </div>
        );
    }

    const { data: users, refetch } = trpc.users.list.useQuery();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<{
        id?: number;
        username: string;
        password: string;
        name: string;
        role: "field_worker" | "sales_office" | "sub_admin" | "admin";
        category: "elephant" | "squirrel" | null;
    } | null>(null);

    const createMutation = trpc.users.create.useMutation({
        onSuccess: () => {
            toast.success("ユーザーを登録しました");
            setIsDialogOpen(false);
            setEditingUser(null);
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "ユーザーの登録に失敗しました");
        },
    });

    const updateMutation = trpc.users.update.useMutation({
        onSuccess: () => {
            toast.success("ユーザーを更新しました");
            setIsDialogOpen(false);
            setEditingUser(null);
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "ユーザーの更新に失敗しました");
        },
    });

    const deleteMutation = trpc.users.delete.useMutation({
        onSuccess: () => {
            toast.success("ユーザーを削除しました");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "ユーザーの削除に失敗しました");
        },
    });

    const handleEdit = (userData: any) => {
        setEditingUser({
            id: userData.id,
            username: userData.username || "",
            password: "",
            // 表示名（社員名）はDBのnameをそのまま使う。未設定なら空。
            name: userData.name || "",
            role: userData.role || "field_worker",
            category: userData.category || null,
        });
        setIsDialogOpen(true);
    };

    const handleSave = () => {
        if (!editingUser || !editingUser.username) {
            toast.error("ユーザー名を入力してください");
            return;
        }

        if (!editingUser.id && !editingUser.password) {
            toast.error("パスワードを入力してください");
            return;
        }

        if (editingUser.id) {
            updateMutation.mutate({
                id: editingUser.id,
                username: editingUser.username,
                password: editingUser.password || undefined,
                // 表示名（社員名）はそのまま保存。空ならundefinedで変更なし。
                name: editingUser.name || undefined,
                role: editingUser.role,
                category: editingUser.category,
            });
        } else {
            createMutation.mutate({
                username: editingUser.username,
                password: editingUser.password,
                name: editingUser.name || undefined,
                role: editingUser.role,
                category: editingUser.category || undefined,
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm("本当に削除しますか？")) {
            deleteMutation.mutate({ id });
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">ユーザー管理</h1>
                    <p className="text-[hsl(var(--muted-foreground))] mt-2">
                        ユーザーの追加・編集・削除を行います
                    </p>
                </div>
                <Button
                    onClick={() => {
                        setEditingUser({
                            username: "",
                            password: "",
                            name: "",
                            role: "field_worker",
                            category: null,
                        });
                        setIsDialogOpen(true);
                    }}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    ユーザー追加
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>ユーザー一覧</CardTitle>
                </CardHeader>
                <CardContent>
                    {users && users.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID</TableHead>
                                    <TableHead>ユーザー名</TableHead>
                                    <TableHead>表示名</TableHead>
                                    <TableHead>ロール</TableHead>
                                    <TableHead>操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.map((userData) => (
                                    <TableRow key={userData.id}>
                                        <TableCell>{userData.id}</TableCell>
                                        <TableCell className="font-medium">{userData.username}</TableCell>
                                        {/* 表示名（社員名）。未設定なら - を表示 */}
                                        <TableCell>{userData.name || "-"}</TableCell>
                                        <TableCell>
                                            <span
                                                className={`px-2 py-1 rounded text-xs ${userData.role === "admin"
                                                    ? "bg-purple-100 text-purple-800"
                                                    : userData.role === "sub_admin"
                                                        ? "bg-blue-100 text-blue-800"
                                                        : userData.role === "sales_office"
                                                            ? "bg-green-100 text-green-800"
                                                            : "bg-gray-100 text-gray-800"
                                                    }`}
                                            >
                                                {userData.role === "admin"
                                                    ? "管理人"
                                                    : userData.role === "sub_admin"
                                                        ? "準管理人"
                                                        : userData.role === "sales_office"
                                                            ? "営業事務"
                                                            : "現場staff"}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleEdit(userData)}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => handleDelete(userData.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-center py-4 text-[hsl(var(--muted-foreground))]">
                            ユーザーがありません
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* 編集ダイアログ */}
            {isDialogOpen && editingUser && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle>{editingUser.id ? "ユーザーを編集" : "ユーザーを追加"}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">ユーザー名 *</label>
                                <Input
                                    value={editingUser.username}
                                    onChange={(e) =>
                                        setEditingUser({ ...editingUser, username: e.target.value })
                                    }
                                    placeholder="ユーザー名を入力"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">
                                    パスワード {editingUser.id ? "（変更する場合のみ）" : "*"}
                                </label>
                                <Input
                                    type="password"
                                    value={editingUser.password}
                                    onChange={(e) =>
                                        setEditingUser({ ...editingUser, password: e.target.value })
                                    }
                                    placeholder="パスワードを入力"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">表示名（社員名）</label>
                                <Input
                                    value={editingUser.name}
                                    onChange={(e) =>
                                        setEditingUser({ ...editingUser, name: e.target.value })
                                    }
                                    placeholder="社員の名前を入力してください"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">ロール</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                    value={editingUser.role}
                                    onChange={(e) =>
                                        setEditingUser({
                                            ...editingUser,
                                            role: e.target.value as "field_worker" | "sales_office" | "sub_admin" | "admin",
                                        })
                                    }
                                >
                                    <option value="field_worker">現場staff</option>
                                    <option value="sales_office">営業事務</option>
                                    <option value="sub_admin">準管理人</option>
                                    <option value="admin">管理人</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    onClick={handleSave}
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                >
                                    保存
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setIsDialogOpen(false);
                                        setEditingUser(null);
                                    }}
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

