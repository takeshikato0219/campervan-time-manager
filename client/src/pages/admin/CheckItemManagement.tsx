import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { trpc } from "../../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CATEGORIES = ["一般", "キャンパー", "中古", "修理", "クレーム"] as const;

export default function CheckItemManagement() {
    const { user } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number]>("一般");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [itemName, setItemName] = useState("");
    const [itemDescription, setItemDescription] = useState("");
    const [displayOrder, setDisplayOrder] = useState(0);

    const { data: checkItems, refetch } = trpc.checks.listCheckItems.useQuery({
        category: selectedCategory,
    });

    const createMutation = trpc.checks.createCheckItem.useMutation({
        onSuccess: () => {
            toast.success("チェック項目を追加しました");
            setIsAddDialogOpen(false);
            setItemName("");
            setItemDescription("");
            setDisplayOrder(0);
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "チェック項目の追加に失敗しました");
        },
    });

    const updateMutation = trpc.checks.updateCheckItem.useMutation({
        onSuccess: () => {
            toast.success("チェック項目を更新しました");
            setIsEditDialogOpen(false);
            setEditingItem(null);
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "チェック項目の更新に失敗しました");
        },
    });

    const deleteMutation = trpc.checks.deleteCheckItem.useMutation({
        onSuccess: () => {
            toast.success("チェック項目を削除しました");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "チェック項目の削除に失敗しました");
        },
    });

    const handleAdd = () => {
        if (!itemName.trim()) {
            toast.error("項目名を入力してください");
            return;
        }

        createMutation.mutate({
            category: selectedCategory,
            name: itemName,
            description: itemDescription || undefined,
            displayOrder,
        });
    };

    const handleEdit = (item: any) => {
        setEditingItem(item);
        setItemName(item.name);
        setItemDescription(item.description || "");
        setDisplayOrder(item.displayOrder || 0);
        setIsEditDialogOpen(true);
    };

    const handleUpdate = () => {
        if (!editingItem || !itemName.trim()) {
            toast.error("項目名を入力してください");
            return;
        }

        updateMutation.mutate({
            id: editingItem.id,
            name: itemName,
            description: itemDescription || undefined,
            displayOrder,
        });
    };

    const handleDelete = (id: number) => {
        if (window.confirm("本当にこのチェック項目を削除しますか？")) {
            deleteMutation.mutate({ id });
        }
    };

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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold">チェック項目管理</h1>
                <p className="text-[hsl(var(--muted-foreground))] mt-2 text-sm sm:text-base">
                    区分ごとのチェック項目を管理します
                </p>
            </div>

            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
                    {CATEGORIES.map((cat) => (
                        <TabsTrigger key={cat} value={cat} className="text-xs sm:text-sm">
                            {cat}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {CATEGORIES.map((category) => (
                    <TabsContent key={category} value={category} className="mt-4">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                            <h2 className="text-lg font-semibold">{category}のチェック項目</h2>
                            <Button
                                onClick={() => {
                                    setItemName("");
                                    setItemDescription("");
                                    setDisplayOrder(0);
                                    setIsAddDialogOpen(true);
                                }}
                                className="w-full sm:w-auto"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                項目追加
                            </Button>
                        </div>

                        <div className="space-y-2">
                            {checkItems && checkItems.length > 0 ? (
                                checkItems.map((item) => (
                                    <Card key={item.id}>
                                        <CardContent className="p-3 sm:p-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="font-semibold text-sm sm:text-base">{item.name}</p>
                                                    {item.description && (
                                                        <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
                                                            {item.description}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                                        表示順: {item.displayOrder}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(item)}
                                                    >
                                                        <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <Card>
                                    <CardContent className="p-4 text-center text-[hsl(var(--muted-foreground))]">
                                        チェック項目がありません
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>
                ))}
            </Tabs>

            {/* 項目追加ダイアログ */}
            {isAddDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <Card className="w-full max-w-md min-w-0 my-auto">
                        <CardHeader className="p-3 sm:p-4 md:p-6">
                            <CardTitle className="text-base sm:text-lg md:text-xl">
                                {selectedCategory}のチェック項目を追加
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">項目名 *</label>
                                <Input
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    placeholder="チェック項目名を入力"
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">説明</label>
                                <Input
                                    value={itemDescription}
                                    onChange={(e) => setItemDescription(e.target.value)}
                                    placeholder="説明を入力（任意）"
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">表示順</label>
                                <Input
                                    type="number"
                                    value={displayOrder}
                                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button
                                    className="flex-1 w-full sm:w-auto"
                                    onClick={handleAdd}
                                    disabled={createMutation.isPending}
                                >
                                    追加
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 w-full sm:w-auto"
                                    onClick={() => setIsAddDialogOpen(false)}
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 項目編集ダイアログ */}
            {isEditDialogOpen && editingItem && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <Card className="w-full max-w-md min-w-0 my-auto">
                        <CardHeader className="p-3 sm:p-4 md:p-6">
                            <CardTitle className="text-base sm:text-lg md:text-xl">チェック項目を編集</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">項目名 *</label>
                                <Input
                                    value={itemName}
                                    onChange={(e) => setItemName(e.target.value)}
                                    placeholder="チェック項目名を入力"
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">説明</label>
                                <Input
                                    value={itemDescription}
                                    onChange={(e) => setItemDescription(e.target.value)}
                                    placeholder="説明を入力（任意）"
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">表示順</label>
                                <Input
                                    type="number"
                                    value={displayOrder}
                                    onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button
                                    className="flex-1 w-full sm:w-auto"
                                    onClick={handleUpdate}
                                    disabled={updateMutation.isPending}
                                >
                                    更新
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 w-full sm:w-auto"
                                    onClick={() => {
                                        setIsEditDialogOpen(false);
                                        setEditingItem(null);
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

