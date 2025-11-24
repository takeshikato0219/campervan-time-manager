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
    const [isBroadcastDialogOpen, setIsBroadcastDialogOpen] = useState(false);
    const [broadcastingVehicleId, setBroadcastingVehicleId] = useState<number | null>(null);
    const [broadcastMessage, setBroadcastMessage] = useState("");
    const [editingVehicle, setEditingVehicle] = useState<any>(null);
    const [vehicleNumber, setVehicleNumber] = useState("");
    const [vehicleTypeId, setVehicleTypeId] = useState("");
    const [category, setCategory] = useState<"一般" | "キャンパー" | "中古" | "修理" | "クレーム">("一般");
    const [customerName, setCustomerName] = useState("");
    const [desiredDeliveryDate, setDesiredDeliveryDate] = useState("");
    const [checkDueDate, setCheckDueDate] = useState("");
    const [reserveDate, setReserveDate] = useState("");
    const [reserveRound, setReserveRound] = useState("");
    const [hasCoating, setHasCoating] = useState<"yes" | "no" | "">("");
    const [hasLine, setHasLine] = useState<"yes" | "no" | "">("");
    const [hasPreferredNumber, setHasPreferredNumber] = useState<"yes" | "no" | "">("");
    const [hasTireReplacement, setHasTireReplacement] = useState<"summer" | "winter" | "no" | "">("");
    const [instructionSheetFile, setInstructionSheetFile] = useState<File | null>(null);
    const [outsourcingDestination, setOutsourcingDestination] = useState("");
    const [outsourcingStartDate, setOutsourcingStartDate] = useState("");
    const [outsourcingEndDate, setOutsourcingEndDate] = useState("");

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
            setCategory("一般");
            setCustomerName("");
            setDesiredDeliveryDate("");
            setCheckDueDate("");
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
            setCheckDueDate("");
            setInstructionSheetFile(null);
            setOutsourcingDestination("");
            setOutsourcingStartDate("");
            setOutsourcingEndDate("");
            refetch();
        },
        onError: (error: any) => {
            toast.error(error.message || "車両の更新に失敗しました");
        },
    });

    const uploadInstructionSheetMutation = trpc.vehicles.uploadInstructionSheet.useMutation({
        onSuccess: () => {
            toast.success("指示書をアップロードしました");
            setInstructionSheetFile(null);
            refetch();
        },
        onError: (error: any) => {
            toast.error(error.message || "指示書のアップロードに失敗しました");
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

    const createBroadcastMutation = trpc.salesBroadcasts.create.useMutation({
        onSuccess: () => {
            toast.success("営業からの拡散を送信しました");
            setIsBroadcastDialogOpen(false);
            setBroadcastingVehicleId(null);
            setBroadcastMessage("");
        },
        onError: (error: any) => {
            toast.error(error.message || "拡散の送信に失敗しました");
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
            category,
            customerName: customerName || undefined,
            desiredDeliveryDate: desiredDeliveryDate ? new Date(desiredDeliveryDate) : undefined,
            checkDueDate: checkDueDate ? new Date(checkDueDate) : undefined,
            reserveDate: reserveDate ? new Date(reserveDate) : undefined,
            reserveRound: reserveRound || undefined,
            hasCoating: hasCoating || undefined,
            hasLine: hasLine || undefined,
            hasPreferredNumber: hasPreferredNumber || undefined,
            hasTireReplacement: hasTireReplacement || undefined,
        });
    };

    const handleEdit = (vehicle: any) => {
        setEditingVehicle(vehicle);
        setVehicleNumber(vehicle.vehicleNumber);
        setVehicleTypeId(vehicle.vehicleTypeId.toString());
        setCategory(vehicle.category || "一般");
        setCustomerName(vehicle.customerName || "");
        setDesiredDeliveryDate(
            vehicle.desiredDeliveryDate
                ? format(new Date(vehicle.desiredDeliveryDate), "yyyy-MM-dd")
                : ""
        );
        setCheckDueDate(
            vehicle.checkDueDate
                ? format(new Date(vehicle.checkDueDate), "yyyy-MM-dd")
                : ""
        );
        setReserveDate(
            vehicle.reserveDate
                ? format(new Date(vehicle.reserveDate), "yyyy-MM-dd")
                : ""
        );
        setReserveRound(vehicle.reserveRound || "");
        setHasCoating(vehicle.hasCoating || "");
        setHasLine(vehicle.hasLine || "");
        setHasPreferredNumber(vehicle.hasPreferredNumber || "");
        setHasTireReplacement(vehicle.hasTireReplacement || "");
        setOutsourcingDestination(vehicle.outsourcingDestination || "");
        setOutsourcingStartDate(
            vehicle.outsourcingStartDate
                ? format(new Date(vehicle.outsourcingStartDate), "yyyy-MM-dd")
                : ""
        );
        setOutsourcingEndDate(
            vehicle.outsourcingEndDate
                ? format(new Date(vehicle.outsourcingEndDate), "yyyy-MM-dd")
                : ""
        );
        setInstructionSheetFile(null);
        setIsEditDialogOpen(true);
    };

    const handleUpdate = () => {
        if (!vehicleNumber || !vehicleTypeId) {
            toast.error("車両番号と車種を入力してください");
            return;
        }

        const updateData: any = {
            id: editingVehicle.id,
            vehicleNumber,
            vehicleTypeId: parseInt(vehicleTypeId),
            category,
        };

        if (customerName) {
            updateData.customerName = customerName;
        }

        if (desiredDeliveryDate) {
            const date = new Date(desiredDeliveryDate);
            if (!isNaN(date.getTime())) {
                updateData.desiredDeliveryDate = date;
            }
        }

        if (checkDueDate) {
            const date = new Date(checkDueDate);
            if (!isNaN(date.getTime())) {
                updateData.checkDueDate = date;
            }
        }

        if (reserveDate) {
            const date = new Date(reserveDate);
            if (!isNaN(date.getTime())) {
                updateData.reserveDate = date;
            }
        }

        if (reserveRound) {
            updateData.reserveRound = reserveRound;
        }

        if (hasCoating) {
            updateData.hasCoating = hasCoating as "yes" | "no";
        }

        if (hasLine) {
            updateData.hasLine = hasLine as "yes" | "no";
        }

        if (hasPreferredNumber) {
            updateData.hasPreferredNumber = hasPreferredNumber as "yes" | "no";
        }

        if (hasTireReplacement) {
            updateData.hasTireReplacement = hasTireReplacement as "summer" | "winter" | "no";
        }

        if (outsourcingDestination) {
            updateData.outsourcingDestination = outsourcingDestination;
        }

        if (outsourcingStartDate) {
            const date = new Date(outsourcingStartDate);
            if (!isNaN(date.getTime())) {
                updateData.outsourcingStartDate = date;
            }
        }

        if (outsourcingEndDate) {
            const date = new Date(outsourcingEndDate);
            if (!isNaN(date.getTime())) {
                updateData.outsourcingEndDate = date;
            }
        }

        updateMutation.mutate(updateData);

        // 指示書ファイルが選択されている場合はアップロード
        if (instructionSheetFile && editingVehicle) {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result as string;
                const fileType = instructionSheetFile.type;
                if (fileType === "image/jpeg" || fileType === "image/jpg" || fileType === "application/pdf") {
                    uploadInstructionSheetMutation.mutate({
                        vehicleId: editingVehicle.id,
                        fileData: base64,
                        fileName: instructionSheetFile.name,
                        fileType: fileType as "image/jpeg" | "image/jpg" | "application/pdf",
                    });
                } else {
                    toast.error("PDFまたはJPGファイルを選択してください");
                }
            };
            reader.readAsDataURL(instructionSheetFile);
        }
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
                <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="in_progress" className="text-xs sm:text-sm">作業中</TabsTrigger>
                    <TabsTrigger value="completed" className="text-xs sm:text-sm">完成</TabsTrigger>
                    <TabsTrigger value="archived" className="text-xs sm:text-sm">保管</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab} className="mt-4">
                    {filteredVehicles && filteredVehicles.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                            {filteredVehicles.map((vehicle) => (
                                <Card key={vehicle.id}>
                                    <CardHeader className="p-3 sm:p-6">
                                        <CardTitle className="text-base sm:text-lg truncate">{vehicle.vehicleNumber}</CardTitle>
                                        <CardDescription className="text-xs sm:text-sm">
                                            {vehicleTypes?.find((vt) => vt.id === vehicle.vehicleTypeId)?.name || "不明"}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="p-3 sm:p-6 space-y-2">
                                        {vehicle.category && (
                                            <p className="text-sm">
                                                <span className="text-[hsl(var(--muted-foreground))]">区分:</span>{" "}
                                                <span className="font-medium">{vehicle.category}</span>
                                            </p>
                                        )}
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
                                        {vehicle.checkDueDate && (
                                            <p className="text-sm">
                                                <span className="text-[hsl(var(--muted-foreground))]">チェック期限:</span>{" "}
                                                {format(new Date(vehicle.checkDueDate), "yyyy年MM月dd日")}
                                            </p>
                                        )}
                                        {vehicle.reserveDate && (
                                            <p className="text-sm">
                                                <span className="text-[hsl(var(--muted-foreground))]">予備権:</span>{" "}
                                                {format(new Date(vehicle.reserveDate), "yyyy年MM月dd日")}
                                                {vehicle.reserveRound && ` ${vehicle.reserveRound}`}
                                            </p>
                                        )}
                                        <div className="flex flex-wrap gap-1 text-xs">
                                            {vehicle.hasCoating && (
                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                                                    コーティング{vehicle.hasCoating === "yes" ? "あり" : "なし"}
                                                </span>
                                            )}
                                            {vehicle.hasLine && (
                                                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded">
                                                    ライン{vehicle.hasLine === "yes" ? "あり" : "なし"}
                                                </span>
                                            )}
                                            {vehicle.hasPreferredNumber && (
                                                <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded">
                                                    希望ナンバー{vehicle.hasPreferredNumber === "yes" ? "あり" : "なし"}
                                                </span>
                                            )}
                                            {vehicle.hasTireReplacement && (
                                                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded">
                                                    タイヤ交換
                                                    {vehicle.hasTireReplacement === "summer"
                                                        ? "（夏タイヤ納車）"
                                                        : vehicle.hasTireReplacement === "winter"
                                                            ? "（冬タイヤ納車）"
                                                            : "なし"}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-2 pt-2">
                                            <div className="flex gap-1 sm:gap-2">
                                                <Link href={`/vehicles/${vehicle.id}`}>
                                                    <Button size="sm" variant="outline" className="flex-1 text-xs sm:text-sm">
                                                        詳細
                                                    </Button>
                                                </Link>
                                                {user?.role === "admin" && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleEdit(vehicle)}
                                                            className="px-2 sm:px-3"
                                                        >
                                                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setBroadcastingVehicleId(vehicle.id);
                                                                setBroadcastMessage("");
                                                                setIsBroadcastDialogOpen(true);
                                                            }}
                                                            className="px-2 sm:px-3"
                                                            title="営業からの拡散"
                                                        >
                                                            拡散
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                            {/* 完成・保管ボタンは管理者のみ表示 */}
                                            {user?.role === "admin" && (
                                                <div className="flex gap-1 sm:gap-2">
                                                    {vehicle.status === "in_progress" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-1 text-xs sm:text-sm"
                                                                onClick={() => {
                                                                    if (confirm("この車両を完成にしますか？")) {
                                                                        completeMutation.mutate({ id: vehicle.id });
                                                                    }
                                                                }}
                                                            >
                                                                <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                                完成
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="flex-1 text-xs sm:text-sm"
                                                                onClick={() => {
                                                                    if (confirm("この車両を保管にしますか？")) {
                                                                        archiveMutation.mutate({ id: vehicle.id });
                                                                    }
                                                                }}
                                                            >
                                                                <Archive className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
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
                                        setCategory("一般");
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <Card className="w-full max-w-md min-w-0 my-auto max-h-[90vh] flex flex-col">
                        <CardHeader className="p-3 sm:p-4 md:p-6 flex-shrink-0">
                            <CardTitle className="text-base sm:text-lg md:text-xl">車両編集</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 overflow-y-auto flex-1">
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">車両番号 *</label>
                                <Input
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value)}
                                    placeholder="例: ABC-001"
                                    required
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">車種 *</label>
                                <select
                                    className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
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
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">区分 *</label>
                                <select
                                    className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value as any)}
                                    required
                                >
                                    <option value="一般">一般</option>
                                    <option value="キャンパー">キャンパー</option>
                                    <option value="中古">中古</option>
                                    <option value="修理">修理</option>
                                    <option value="クレーム">クレーム</option>
                                </select>
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">お客様名</label>
                                <Input
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="お客様名を入力"
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">希望納期</label>
                                <Input
                                    type="date"
                                    value={desiredDeliveryDate}
                                    onChange={(e) => setDesiredDeliveryDate(e.target.value)}
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">チェック期限</label>
                                <Input
                                    type="date"
                                    value={checkDueDate}
                                    onChange={(e) => setCheckDueDate(e.target.value)}
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">予備権の日付</label>
                                <Input
                                    type="date"
                                    value={reserveDate}
                                    onChange={(e) => setReserveDate(e.target.value)}
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">予備権のR</label>
                                <Input
                                    value={reserveRound}
                                    onChange={(e) => setReserveRound(e.target.value)}
                                    placeholder="例: 1R, 2R"
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">コーティング</label>
                                <select
                                    className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                    value={hasCoating}
                                    onChange={(e) => setHasCoating(e.target.value as "yes" | "no" | "")}
                                >
                                    <option value="">選択してください</option>
                                    <option value="yes">あり</option>
                                    <option value="no">なし</option>
                                </select>
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">ライン</label>
                                <select
                                    className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                    value={hasLine}
                                    onChange={(e) => setHasLine(e.target.value as "yes" | "no" | "")}
                                >
                                    <option value="">選択してください</option>
                                    <option value="yes">あり</option>
                                    <option value="no">なし</option>
                                </select>
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">希望ナンバー</label>
                                <select
                                    className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                    value={hasPreferredNumber}
                                    onChange={(e) => setHasPreferredNumber(e.target.value as "yes" | "no" | "")}
                                >
                                    <option value="">選択してください</option>
                                    <option value="yes">あり</option>
                                    <option value="no">なし</option>
                                </select>
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">タイヤ交換</label>
                                <select
                                    className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                    value={hasTireReplacement}
                                    onChange={(e) => setHasTireReplacement(e.target.value as "summer" | "winter" | "no" | "")}
                                >
                                    <option value="">選択してください</option>
                                    <option value="summer">あり（夏タイヤ納車）</option>
                                    <option value="winter">あり（冬タイヤ納車）</option>
                                    <option value="no">なし</option>
                                </select>
                            </div>
                            {user?.role === "admin" && (
                                <div className="min-w-0">
                                    <label className="text-sm font-medium block mb-1">指示書（PDF/JPG）</label>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="file"
                                            accept=".pdf,.jpg,.jpeg"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    setInstructionSheetFile(file);
                                                }
                                            }}
                                            className="w-full min-w-0"
                                        />
                                        {editingVehicle?.instructionSheetUrl && (
                                            <a
                                                href={editingVehicle.instructionSheetUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:text-blue-800 underline"
                                            >
                                                現在の指示書を表示
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">外注先</label>
                                <Input
                                    value={outsourcingDestination}
                                    onChange={(e) => setOutsourcingDestination(e.target.value)}
                                    placeholder="外注先を入力"
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">外注開始日</label>
                                <Input
                                    type="date"
                                    value={outsourcingStartDate}
                                    onChange={(e) => setOutsourcingStartDate(e.target.value)}
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">外注終了日</label>
                                <Input
                                    type="date"
                                    value={outsourcingEndDate}
                                    onChange={(e) => setOutsourcingEndDate(e.target.value)}
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 pt-2 flex-shrink-0">
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
                                        setEditingVehicle(null);
                                        setVehicleNumber("");
                                        setVehicleTypeId("");
                                        setCustomerName("");
                                        setDesiredDeliveryDate("");
                                        setCheckDueDate("");
                                        setReserveDate("");
                                        setReserveRound("");
                                        setHasCoating("");
                                        setHasLine("");
                                        setHasPreferredNumber("");
                                        setHasTireReplacement("");
                                    }}
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* 営業からの拡散ダイアログ */}
            {isBroadcastDialogOpen && broadcastingVehicleId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <Card className="w-full max-w-md min-w-0 my-auto">
                        <CardHeader className="p-3 sm:p-4 md:p-6">
                            <CardTitle className="text-base sm:text-lg md:text-xl">営業からの拡散</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">コメント *</label>
                                <textarea
                                    value={broadcastMessage}
                                    onChange={(e) => setBroadcastMessage(e.target.value)}
                                    placeholder="全員に通知するコメントを入力してください"
                                    className="flex min-h-[120px] w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                    required
                                />
                                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                    このコメントは全員のダッシュボードに通知されます。一週間後に自動で削除されます。
                                </p>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button
                                    className="flex-1 w-full sm:w-auto"
                                    onClick={() => {
                                        if (!broadcastMessage.trim()) {
                                            toast.error("コメントを入力してください");
                                            return;
                                        }
                                        createBroadcastMutation.mutate({
                                            vehicleId: broadcastingVehicleId,
                                            message: broadcastMessage,
                                        });
                                    }}
                                    disabled={createBroadcastMutation.isPending}
                                >
                                    {createBroadcastMutation.isPending ? "送信中..." : "送信"}
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 w-full sm:w-auto"
                                    onClick={() => {
                                        setIsBroadcastDialogOpen(false);
                                        setBroadcastingVehicleId(null);
                                        setBroadcastMessage("");
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

