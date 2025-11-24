import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Plus, Search, Edit, Check, Archive } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { format } from "date-fns";

export default function Vehicles() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<"in_progress" | "completed" | "archived">("in_progress");
    const [searchQuery, setSearchQuery] = useState("");
    const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<any>(null);
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [vehicleTypeId, setVehicleTypeId] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [desiredDeliveryDate, setDesiredDeliveryDate] = useState("");

    const { data: vehicles, refetch } = trpc.vehicles.list.useQuery({
        status: activeTab,
    });
    const { data: vehicleTypes } = trpc.vehicleTypes.list.useQuery();

    const registerMutation = trpc.vehicles.create.useMutation({
        onSuccess: () => {
            toast.success("車両を登録しました");
            setIsRegisterDialogOpen(false);
            setVehicleNumber("");
            setVehicleTypeId("");
            setCustomerName("");
            setDesiredDeliveryDate("");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "車両の登録に失敗しました");
        },
    });

    const updateMutation = trpc.vehicles.update.useMutation({
        onSuccess: () => {
            toast.success("車両を更新しました");
            setIsEditDialogOpen(false);
            setEditingVehicle(null);
            setVehicleNumber("");
            setVehicleTypeId("");
            setCustomerName("");
            setDesiredDeliveryDate("");
            refetch();
        },
        onError: (error: any) => {
            toast.error(error.message || "車両の更新に失敗しました");
        },
    });

    const completeMutation = trpc.vehicles.complete.useMutation({
        onSuccess: () => {
            toast.success("車両を完成にしました");
            refetch();
        },
        onError: (error: any) => {
            toast.error(error.message || "車両の完成処理に失敗しました");
        },
    });

    const uncompleteMutation = trpc.vehicles.uncomplete.useMutation({
        onSuccess: () => {
            toast.success("車両を作業中に戻しました");
            refetch();
        },
        onError: (error: any) => {
            toast.error(error.message || "車両の取り消し処理に失敗しました");
        },
    });

    const archiveMutation = trpc.vehicles.archive.useMutation({
        onSuccess: () => {
            toast.success("車両を保管にしました");
            refetch();
        },
        onError: (error: any) => {
            toast.error(error.message || "車両の保管処理に失敗しました");
        },
    });

    const unarchiveMutation = trpc.vehicles.unarchive.useMutation({
        onSuccess: () => {
            toast.success("車両を完成に戻しました");
            refetch();
        },
        onError: (error: any) => {
            toast.error(error.message || "車両の取り出し処理に失敗しました");
        },
    });

    const filteredVehicles = vehicles?.filter((vehicle) => {
        const query = searchQuery.toLowerCase();
        const vehicleTypeName =
            vehicleTypes?.find((vt) => vt.id === vehicle.vehicleTypeId)?.name || "";
        return (
            vehicle.vehicleNumber.toLowerCase().includes(query) ||
            (vehicle.customerName && vehicle.customerName.toLowerCase().includes(query)) ||
            vehicleTypeName.toLowerCase().includes(query)
        );
    });

    const handleRegister = () => {
        if (!vehicleNumber || !vehicleTypeId) {
            toast.error("車両番号と車種を入力してください");
            return;
        }

        registerMutation.mutate({
            vehicleNumber,
            vehicleTypeId: parseInt(vehicleTypeId),
            customerName: customerName || undefined,
            desiredDeliveryDate: desiredDeliveryDate ? new Date(desiredDeliveryDate) : undefined,
        });
    };

    const handleEdit = (vehicle: any) => {
        setEditingVehicle(vehicle);
        setVehicleNumber(vehicle.vehicleNumber);
        setVehicleTypeId(vehicle.vehicleTypeId.toString());
        setCustomerName(vehicle.customerName || "");
        setDesiredDeliveryDate(
            vehicle.desiredDeliveryDate
                ? format(new Date(vehicle.desiredDeliveryDate), "yyyy-MM-dd")
                : ""
        );
        setIsEditDialogOpen(true);
    };

    const handleUpdate = () => {
        if (!vehicleNumber || !vehicleTypeId) {
            toast.error("車両番号と車種を入力してください");
            return;
        }

        updateMutation.mutate({
            id: editingVehicle.id,
            vehicleNumber,
            vehicleTypeId: parseInt(vehicleTypeId),
            customerName: customerName || undefined,
            desiredDeliveryDate: desiredDeliveryDate ? new Date(desiredDeliveryDate) : undefined,
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">車両管理</h1>
                    <p className="text-[hsl(var(--muted-foreground))] mt-2 text-sm sm:text-base">
                        車両の一覧、登録、編集を行います
                    </p>
                </div>
                <Button onClick={() => setIsRegisterDialogOpen(true)} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    車両登録
                </Button>
            </div>

            {/* 検索 */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[hsl(var(--muted-foreground))]" />
                    <Input
                        placeholder="車両番号、お客様名、車種で検索..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* タブ */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList>
                    <TabsTrigger value="in_progress">作業中</TabsTrigger>
                    <TabsTrigger value="completed">完成</TabsTrigger>
                    <TabsTrigger value="archived">保管</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {filteredVehicles && filteredVehicles.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredVehicles.map((vehicle) => (
                                <Card key={vehicle.id}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{vehicle.vehicleNumber}</CardTitle>
                                        <CardDescription>
                                            {vehicleTypes?.find((vt) => vt.id === vehicle.vehicleTypeId)?.name || "不明"}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {vehicle.customerName && (
                                            <p className="text-sm">
                                                <span className="text-[hsl(var(--muted-foreground))]">お客様名:</span>{" "}
                                                {vehicle.customerName}
                                            </p>
                                        )}
                                        {vehicle.desiredDeliveryDate && (
                                            <p className="text-sm">
                                                <span className="text-[hsl(var(--muted-foreground))]">希望納期:</span>{" "}
                                                {format(new Date(vehicle.desiredDeliveryDate), "yyyy年MM月dd日")}
                                            </p>
                                        )}
                                        <div className="flex flex-col gap-2 pt-2">
                                            <div className="flex gap-2">
                                                <Link href={`/vehicles/${vehicle.id}`}>
                                                    <Button size="sm" variant="outline" className="flex-1">
                                                        詳細
                                                    </Button>
                                                </Link>
                                                {user?.role === "admin" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => handleEdit(vehicle)}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            {/* 完成・保管ボタンは管理者のみ表示 */}
                                            {user?.role === "admin" && (
                                                <div className="flex gap-2">
                                                    {vehicle.status === "in_progress" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-1"
                                                                onClick={() => {
                                                                    if (confirm("この車両を完成にしますか？")) {
                                                                        completeMutation.mutate({ id: vehicle.id });
                                                                    }
                                                                }}
                                                            >
                                                                <Check className="h-4 w-4 mr-1" />
                                                                完成
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-1"
                                                                onClick={() => {
                                                                    if (confirm("この車両を保管にしますか？")) {
                                                                        archiveMutation.mutate({ id: vehicle.id });
                                                                    }
                                                                }}
                                                            >
                                                                <Archive className="h-4 w-4 mr-1" />
                                                                保管
                                                            </Button>
                                                        </>
                                                    )}
                                                    {vehicle.status === "completed" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-1"
                                                                onClick={() => {
                                                                    if (confirm("この車両を作業中に戻しますか？")) {
                                                                        uncompleteMutation.mutate({ id: vehicle.id });
                                                                    }
                                                                }}
                                                            >
                                                                作業中に戻す
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-1"
                                                                onClick={() => {
                                                                    if (confirm("この車両を保管にしますか？")) {
                                                                        archiveMutation.mutate({ id: vehicle.id });
                                                                    }
                                                                }}
                                                            >
                                                                <Archive className="h-4 w-4 mr-1" />
                                                                保管
                                                            </Button>
                                                        </>
                                                    )}
                                                    {vehicle.status === "archived" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="flex-1"
                                                            onClick={() => {
                                                                if (confirm("この車両を完成に戻しますか？")) {
                                                                    unarchiveMutation.mutate({ id: vehicle.id });
                                                                }
                                                            }}
                                                        >
                                                            完成に戻す
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-[hsl(var(--muted-foreground))]">
                            車両が見つかりません
                        </div>
                    )}
                </TabsContent>
            </Tabs>

            {/* 車両登録ダイアログ */}
            {isRegisterDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle>車両登録</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">車両番号 *</label>
                                <Input
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value)}
                                    placeholder="例: ABC-001"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">車種 *</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                    value={vehicleTypeId}
                                    onChange={(e) => setVehicleTypeId(e.target.value)}
                                    required
                                >
                                    <option value="">選択してください</option>
                                    {vehicleTypes?.map((vt) => (
                                        <option key={vt.id} value={vt.id}>
                                            {vt.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">お客様名</label>
                                <Input
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="お客様名を入力"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">希望納期</label>
                                <Input
                                    type="date"
                                    value={desiredDeliveryDate}
                                    onChange={(e) => setDesiredDeliveryDate(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    onClick={handleRegister}
                                    disabled={registerMutation.isPending}
                                >
                                    登録
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setIsRegisterDialogOpen(false);
                                        setVehicleNumber("");
                                        setVehicleTypeId("");
                                        setCustomerName("");
                                        setDesiredDeliveryDate("");
                                    }}
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 車両編集ダイアログ */}
            {isEditDialogOpen && editingVehicle && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle>車両編集</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">車両番号 *</label>
                                <Input
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value)}
                                    placeholder="例: ABC-001"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">車種 *</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                    value={vehicleTypeId}
                                    onChange={(e) => setVehicleTypeId(e.target.value)}
                                    required
                                >
                                    <option value="">選択してください</option>
                                    {vehicleTypes?.map((vt) => (
                                        <option key={vt.id} value={vt.id}>
                                            {vt.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">お客様名</label>
                                <Input
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="お客様名を入力"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">希望納期</label>
                                <Input
                                    type="date"
                                    value={desiredDeliveryDate}
                                    onChange={(e) => setDesiredDeliveryDate(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    onClick={handleUpdate}
                                    disabled={updateMutation.isPending}
                                >
                                    更新
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setIsEditDialogOpen(false);
                                        setEditingVehicle(null);
                                        setVehicleNumber("");
                                        setVehicleTypeId("");
                                        setCustomerName("");
                                        setDesiredDeliveryDate("");
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

