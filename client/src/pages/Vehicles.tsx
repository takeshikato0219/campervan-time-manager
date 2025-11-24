import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Plus, Search, Edit, Check, Archive, FileText, Trash2, ClipboardCheck } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { format } from "date-fns";

// 車両詳細コンテンツコンポーネント
function VehicleDetailContent({ vehicleId, user }: { vehicleId: number; user: any }) {
    const { data: vehicle } = trpc.vehicles.get.useQuery({ id: vehicleId });
    const { data: attentionPoints, refetch: refetchAttentionPoints } = trpc.vehicles.getAttentionPoints.useQuery(
        { vehicleId },
        { enabled: !!vehicleId }
    );
    const addAttentionPointMutation = trpc.vehicles.addAttentionPoint.useMutation({
        onSuccess: () => {
            toast.success("注意ポイントを追加しました");
            refetchAttentionPoints();
        },
        onError: (error) => {
            toast.error(error.message || "注意ポイントの追加に失敗しました");
        },
    });

    const deleteAttentionPointMutation = trpc.vehicles.deleteAttentionPoint.useMutation({
        onSuccess: () => {
            toast.success("注意ポイントを削除しました");
            refetchAttentionPoints();
        },
        onError: (error) => {
            toast.error(error.message || "注意ポイントの削除に失敗しました");
        },
    });

    const [isAttentionPointDialogOpen, setIsAttentionPointDialogOpen] = useState(false);
    const [attentionPointContent, setAttentionPointContent] = useState("");


    if (!vehicle) {
        return (
            <CardContent className="p-4">
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))]">読み込み中...</p>
            </CardContent>
        );
    }

    return (
        <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4 border-t bg-gray-50/50">
            {/* 指示書と注意ポイント */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 md:gap-4">
                {/* 指示書 */}
                <Card className="flex-1 min-w-0 sm:min-w-[200px]">
                    <CardHeader className="p-2 sm:p-3">
                        <CardTitle className="text-xs sm:text-sm">指示書</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-3">
                        {vehicle.instructionSheetUrl ? (
                            <a
                                href={vehicle.instructionSheetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1.5 sm:gap-2 text-blue-600 hover:text-blue-800 underline text-xs sm:text-sm"
                            >
                                <FileText className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                                指示書を表示
                            </a>
                        ) : (
                            <p className="text-[10px] sm:text-xs text-[hsl(var(--muted-foreground))]">指示書がアップロードされていません</p>
                        )}
                    </CardContent>
                </Card>

                {/* 注意ポイント */}
                <Card className="flex-1 min-w-0 sm:min-w-[200px]">
                    <CardHeader className="p-2 sm:p-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-xs sm:text-sm">注意ポイント</CardTitle>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setAttentionPointContent("");
                                    setIsAttentionPointDialogOpen(true);
                                }}
                                className="h-5 sm:h-6 px-1.5 sm:px-2 text-[10px] sm:text-xs"
                            >
                                <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                                追加
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-3">
                        {attentionPoints && attentionPoints.length > 0 ? (
                            <div className="space-y-1.5 sm:space-y-2">
                                {attentionPoints.map((ap) => (
                                    <div
                                        key={ap.id}
                                        className="p-1.5 sm:p-2 border border-[hsl(var(--border))] rounded-lg bg-yellow-50"
                                    >
                                        <p className="text-[10px] sm:text-xs break-words">{ap.content}</p>
                                        <div className="flex items-center justify-between mt-0.5 sm:mt-1">
                                            <p className="text-[10px] sm:text-xs text-[hsl(var(--muted-foreground))]">
                                                {format(new Date(ap.createdAt), "yyyy-MM-dd HH:mm")} - {ap.userName}
                                            </p>
                                            {user?.role === "admin" && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        if (confirm("この注意ポイントを削除しますか？")) {
                                                            deleteAttentionPointMutation.mutate({ id: ap.id });
                                                        }
                                                    }}
                                                    className="h-4 sm:h-5 px-0.5 sm:px-1 text-red-600 hover:text-red-800"
                                                >
                                                    <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] sm:text-xs text-[hsl(var(--muted-foreground))]">注意ポイントがありません</p>
                        )}
                    </CardContent>
                </Card>
            </div>



            {/* メモ */}
            <Card className="border-2">
                <CardHeader className="p-2 sm:p-3 md:p-4 bg-white border-b">
                    <CardTitle className="text-xs sm:text-sm font-semibold">メモ</CardTitle>
                </CardHeader>
                <CardContent className="p-2 sm:p-3 md:p-4">
                    {vehicle.memos && vehicle.memos.length > 0 ? (
                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-2 overflow-x-auto">
                            {vehicle.memos.map((memo: any) => (
                                <div
                                    key={memo.id}
                                    className="flex-1 sm:flex-shrink-0 sm:min-w-[200px] p-2 sm:p-3 border border-[hsl(var(--border))] rounded-lg bg-white"
                                >
                                    <p className="text-[10px] sm:text-xs mb-1 break-words">{memo.content}</p>
                                    <p className="text-[10px] sm:text-xs text-[hsl(var(--muted-foreground))]">
                                        {format(new Date(memo.createdAt), "yyyy-MM-dd HH:mm")} - {memo.userName}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center py-1 sm:py-2 text-[10px] sm:text-xs text-[hsl(var(--muted-foreground))]">
                            メモがありません
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* 注意ポイント追加ダイアログ */}
            {isAttentionPointDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <Card className="w-full max-w-md min-w-0 my-auto">
                        <CardHeader className="p-3 sm:p-4">
                            <CardTitle className="text-sm">注意ポイントを追加</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 space-y-3">
                            <div className="min-w-0">
                                <label className="text-xs font-medium block mb-1">注意ポイント *</label>
                                <textarea
                                    value={attentionPointContent}
                                    onChange={(e) => setAttentionPointContent(e.target.value)}
                                    placeholder="注意ポイントを入力してください"
                                    className="flex min-h-[100px] w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 py-1 text-xs"
                                    required
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button
                                    size="sm"
                                    className="flex-1 h-8 text-xs"
                                    onClick={() => {
                                        if (!attentionPointContent.trim()) {
                                            toast.error("注意ポイントを入力してください");
                                            return;
                                        }
                                        addAttentionPointMutation.mutate({
                                            vehicleId,
                                            content: attentionPointContent,
                                        });
                                        setIsAttentionPointDialogOpen(false);
                                        setAttentionPointContent("");
                                    }}
                                    disabled={addAttentionPointMutation.isPending}
                                >
                                    {addAttentionPointMutation.isPending ? "追加中..." : "追加"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1 h-8 text-xs"
                                    onClick={() => {
                                        setIsAttentionPointDialogOpen(false);
                                        setAttentionPointContent("");
                                    }}
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </CardContent>
    );
}

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
                                <Card key={vehicle.id} className="overflow-hidden">
                                    <CardHeader className="p-3 sm:p-4 md:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
                                        <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3">
                                            <div className="flex-1 min-w-0 w-full sm:w-auto">
                                                <div className="mb-1 sm:mb-2">
                                                    <CardTitle className="text-base sm:text-lg md:text-xl font-bold truncate mb-0.5 sm:mb-1">
                                                        {vehicle.vehicleNumber}
                                                    </CardTitle>
                                                    <p className="text-[10px] sm:text-xs text-gray-500 font-mono">ID: {vehicle.id}</p>
                                                </div>
                                                {vehicle.customerName && (
                                                    <p className="text-sm sm:text-base md:text-lg font-semibold text-gray-900 mb-1 sm:mb-2 break-words">
                                                        {vehicle.customerName}
                                                    </p>
                                                )}
                                                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                                                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-white/80 text-gray-700 border border-gray-200">
                                                        {vehicleTypes?.find((vt) => vt.id === vehicle.vehicleTypeId)?.name || "不明"}
                                                    </span>
                                                    {vehicle.category && (
                                                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-semibold bg-blue-600 text-white">
                                                            {vehicle.category}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex gap-1 flex-shrink-0 w-full sm:w-auto justify-end sm:justify-start">
                                                <Link href="/vehicle-checks" className="flex-1 sm:flex-none">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-7 sm:h-8 px-2 text-[10px] sm:text-xs w-full sm:w-auto"
                                                        title="車両チェック"
                                                    >
                                                        <ClipboardCheck className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                                                        <span className="hidden sm:inline">チェック</span>
                                                    </Button>
                                                </Link>
                                                {user?.role === "admin" && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleEdit(vehicle)}
                                                            className="h-7 sm:h-8 w-7 sm:w-8 p-0 flex-shrink-0"
                                                            title="編集"
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
                                                            className="h-7 sm:h-8 px-2 text-[10px] sm:text-xs flex-1 sm:flex-none"
                                                            title="営業からの拡散"
                                                        >
                                                            <span className="hidden sm:inline">拡散</span>
                                                            <span className="sm:hidden">拡</span>
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                                        {/* 基本情報セクション */}
                                        <div className="space-y-2 sm:space-y-3">
                                            <div className="grid grid-cols-1 gap-2 sm:gap-3">
                                                {vehicle.desiredDeliveryDate && (
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                        <span className="text-[10px] sm:text-xs font-medium text-[hsl(var(--muted-foreground))] sm:min-w-[80px]">
                                                            希望納期:
                                                        </span>
                                                        <span className="text-xs sm:text-sm font-medium">
                                                            {format(new Date(vehicle.desiredDeliveryDate), "yyyy年MM月dd日")}
                                                        </span>
                                                    </div>
                                                )}
                                                {vehicle.checkDueDate && (
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                        <span className="text-[10px] sm:text-xs font-medium text-[hsl(var(--muted-foreground))] sm:min-w-[80px]">
                                                            チェック期限:
                                                        </span>
                                                        <span className="text-xs sm:text-sm font-medium text-orange-600">
                                                            {format(new Date(vehicle.checkDueDate), "yyyy年MM月dd日")}
                                                        </span>
                                                    </div>
                                                )}
                                                {vehicle.reserveDate && (
                                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                        <span className="text-[10px] sm:text-xs font-medium text-[hsl(var(--muted-foreground))] sm:min-w-[80px]">
                                                            予備権:
                                                        </span>
                                                        <span className="text-xs sm:text-sm font-medium">
                                                            {format(new Date(vehicle.reserveDate), "yyyy年MM月dd日")}
                                                            {vehicle.reserveRound && (
                                                                <span className="ml-1 px-1 sm:px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] sm:text-xs">
                                                                    {vehicle.reserveRound}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* 外注情報 */}
                                        {(vehicle.outsourcingDestination || vehicle.outsourcingStartDate || vehicle.outsourcingEndDate) && (
                                            <div className="pt-2 border-t">
                                                <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
                                                    <span className="text-[10px] sm:text-xs font-semibold text-gray-700">外注情報:</span>
                                                </div>
                                                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                                                    {vehicle.outsourcingDestination && (
                                                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200 break-words">
                                                            先: {vehicle.outsourcingDestination}
                                                        </span>
                                                    )}
                                                    {vehicle.outsourcingStartDate && vehicle.outsourcingEndDate && (
                                                        <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-200 whitespace-nowrap">
                                                            {format(new Date(vehicle.outsourcingStartDate), "yyyy/MM/dd")} - {format(new Date(vehicle.outsourcingEndDate), "yyyy/MM/dd")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* オプション情報バッジ */}
                                        {(vehicle.hasCoating || vehicle.hasLine || vehicle.hasPreferredNumber || vehicle.hasTireReplacement) && (
                                            <div className="flex flex-wrap gap-1.5 sm:gap-2 pt-2 border-t">
                                                {vehicle.hasCoating && (
                                                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                                                        コーティング{vehicle.hasCoating === "yes" ? "あり" : "なし"}
                                                    </span>
                                                )}
                                                {vehicle.hasLine && (
                                                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                        ライン{vehicle.hasLine === "yes" ? "あり" : "なし"}
                                                    </span>
                                                )}
                                                {vehicle.hasPreferredNumber && (
                                                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">
                                                        希望ナンバー{vehicle.hasPreferredNumber === "yes" ? "あり" : "なし"}
                                                    </span>
                                                )}
                                                {vehicle.hasTireReplacement && (
                                                    <span className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
                                                        タイヤ交換
                                                        {vehicle.hasTireReplacement === "summer"
                                                            ? "（夏タイヤ納車）"
                                                            : vehicle.hasTireReplacement === "winter"
                                                                ? "（冬タイヤ納車）"
                                                                : "なし"}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {/* アクションボタン */}
                                        {user?.role === "admin" && (
                                            <div className="flex flex-col gap-1.5 sm:gap-2 pt-2 border-t">
                                                {vehicle.status === "in_progress" && (
                                                    <div className="flex gap-1.5 sm:gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="flex-1 text-[10px] sm:text-xs md:text-sm h-7 sm:h-8"
                                                            onClick={() => {
                                                                if (confirm("この車両を完成にしますか？")) {
                                                                    completeMutation.mutate({ id: vehicle.id });
                                                                }
                                                            }}
                                                        >
                                                            <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                                                            完成
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="flex-1 text-[10px] sm:text-xs md:text-sm h-7 sm:h-8"
                                                            onClick={() => {
                                                                if (confirm("この車両を保管にしますか？")) {
                                                                    archiveMutation.mutate({ id: vehicle.id });
                                                                }
                                                            }}
                                                        >
                                                            <Archive className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                                                            保管
                                                        </Button>
                                                    </div>
                                                )}
                                                {vehicle.status === "completed" && (
                                                    <div className="flex gap-1.5 sm:gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="flex-1 text-[10px] sm:text-xs h-7 sm:h-8"
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
                                                            className="flex-1 text-[10px] sm:text-xs h-7 sm:h-8"
                                                            onClick={() => {
                                                                if (confirm("この車両を保管にしますか？")) {
                                                                    archiveMutation.mutate({ id: vehicle.id });
                                                                }
                                                            }}
                                                        >
                                                            <Archive className="h-3 w-3 sm:h-4 sm:w-4 mr-0.5 sm:mr-1" />
                                                            保管
                                                        </Button>
                                                    </div>
                                                )}
                                                {vehicle.status === "archived" && (
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="w-full text-[10px] sm:text-xs h-7 sm:h-8"
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
                                    </CardContent>
                                    <VehicleDetailContent vehicleId={vehicle.id} user={user} />
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

