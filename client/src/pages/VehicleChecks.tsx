import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Check, AlertCircle, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "wouter";

const CATEGORIES = ["一般", "キャンパー", "中古", "修理", "クレーム"] as const;

// チェック依頼ダイアログコンポーネント
function CheckRequestDialog({
    vehicleId,
    checkItemId,
    users,
    requestedToUserId,
    setRequestedToUserId,
    requestDueDate,
    setRequestDueDate,
    requestMessage,
    setRequestMessage,
    onSubmit,
    onCancel,
    isPending,
}: {
    vehicleId: number;
    checkItemId?: number;
    users: any[];
    requestedToUserId: string;
    setRequestedToUserId: (value: string) => void;
    requestDueDate: string;
    setRequestDueDate: (value: string) => void;
    requestMessage: string;
    setRequestMessage: (value: string) => void;
    onSubmit: (selectedCheckItemId?: number) => void;
    onCancel: () => void;
    isPending: boolean;
}) {
    const { data: checkData } = trpc.checks.getVehicleChecks.useQuery({
        vehicleId,
    });

    const checkItems = checkData?.checkStatus?.map((s: any) => s.checkItem) || [];
    const [selectedCheckItemId, setSelectedCheckItemId] = useState<string>(
        checkItemId ? checkItemId.toString() : ""
    );

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
            <Card className="w-full max-w-md min-w-0 my-auto">
                <CardHeader className="p-3 sm:p-4 md:p-6">
                    <CardTitle className="text-base sm:text-lg md:text-xl">チェック依頼</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                    <div className="min-w-0">
                        <label className="text-sm font-medium block mb-1">チェック項目 *</label>
                        <select
                            className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 sm:px-3 py-2 text-sm"
                            value={selectedCheckItemId}
                            onChange={(e) => setSelectedCheckItemId(e.target.value)}
                            disabled={!!checkItemId}
                        >
                            <option value="">選択してください</option>
                            {checkItems.map((item: any) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="min-w-0">
                        <label className="text-sm font-medium block mb-1">依頼先ユーザー *</label>
                        <select
                            className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 sm:px-3 py-2 text-sm"
                            value={requestedToUserId}
                            onChange={(e) => setRequestedToUserId(e.target.value)}
                        >
                            <option value="">選択してください</option>
                            {users.map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.name || u.username}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="min-w-0">
                        <label className="text-sm font-medium block mb-1">期限日（任意）</label>
                        <Input
                            type="date"
                            value={requestDueDate}
                            onChange={(e) => setRequestDueDate(e.target.value)}
                            className="w-full min-w-0"
                        />
                    </div>
                    <div className="min-w-0">
                        <label className="text-sm font-medium block mb-1">メッセージ（任意）</label>
                        <Input
                            value={requestMessage}
                            onChange={(e) => setRequestMessage(e.target.value)}
                            placeholder="依頼メッセージを入力"
                            className="w-full min-w-0"
                        />
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                            className="flex-1 w-full sm:w-auto"
                            onClick={() => {
                                const itemIdToUse = checkItemId || (selectedCheckItemId ? parseInt(selectedCheckItemId) : undefined);
                                if (!itemIdToUse) {
                                    toast.error("チェック項目を選択してください");
                                    return;
                                }
                                onSubmit(itemIdToUse);
                            }}
                            disabled={isPending}
                        >
                            依頼送信
                        </Button>
                        <Button variant="outline" className="flex-1 w-full sm:w-auto" onClick={onCancel}>
                            キャンセル
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// 車両チェックカードコンポーネント
function VehicleCheckCard({
    vehicle,
    onCheck,
    onRequestCheck,
    onCheckAll,
    isAdmin,
    pendingRequests,
}: {
    vehicle: any;
    onCheck: (vehicleId: number, itemId: number, status: "checked" | "needs_recheck" | "unchecked", notes?: string) => void;
    onRequestCheck: (vehicleId: number, checkItemId?: number) => void;
    onCheckAll: (vehicleId: number, itemIds: number[]) => void;
    isAdmin: boolean;
    pendingRequests: any[];
}) {
    const { data: checkData } = trpc.checks.getVehicleChecks.useQuery({
        vehicleId: vehicle.id,
    });

    const pendingRequestsForVehicle = pendingRequests.filter((req) => req.vehicleId === vehicle.id);

    // 未チェック項目のIDリスト
    const uncheckedItemIds = checkData?.checkStatus
        ?.filter((s: any) => s.status === "unchecked")
        .map((s: any) => s.checkItem.id) || [];

    return (
        <Card>
            <CardHeader className="p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                        <CardTitle className="text-base sm:text-lg truncate">{vehicle.vehicleNumber}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                            {vehicle.category && (
                                <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                    {vehicle.category}
                                </span>
                            )}
                            {vehicle.customerName && (
                                <span className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
                                    {vehicle.customerName}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {uncheckedItemIds.length > 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onCheckAll(vehicle.id, uncheckedItemIds)}
                            >
                                車両にチェック
                            </Button>
                        )}
                        {isAdmin && (
                            <>
                                <Button size="sm" variant="outline" onClick={() => onRequestCheck(vehicle.id)}>
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    依頼
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                {pendingRequestsForVehicle.length > 0 && (
                    <div className="flex items-center gap-2 text-orange-600 text-xs sm:text-sm mt-2">
                        <AlertCircle className="h-4 w-4" />
                        <span>チェック依頼あり</span>
                    </div>
                )}
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
                {checkData && checkData.checkStatus && checkData.checkStatus.length > 0 ? (
                    <div className="space-y-2">
                        {checkData.checkStatus.map((status: any) => {
                            const getStatusLabel = (statusValue: string) => {
                                switch (statusValue) {
                                    case "checked":
                                        return "チェック済み";
                                    case "needs_recheck":
                                        return "要再チェック";
                                    case "unchecked":
                                    default:
                                        return "未チェック";
                                }
                            };

                            const getStatusColor = (statusValue: string) => {
                                switch (statusValue) {
                                    case "checked":
                                        return "bg-green-50 border-green-200";
                                    case "needs_recheck":
                                        return "bg-orange-50 border-orange-200";
                                    case "unchecked":
                                    default:
                                        return "bg-gray-50 border-gray-200";
                                }
                            };

                            const getStatusIcon = (statusValue: string) => {
                                switch (statusValue) {
                                    case "checked":
                                        return <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-0.5" />;
                                    case "needs_recheck":
                                        return <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600 flex-shrink-0 mt-0.5" />;
                                    case "unchecked":
                                    default:
                                        return <div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-gray-300 rounded flex-shrink-0 mt-0.5" />;
                                }
                            };

                            return (
                                <div
                                    key={status.checkItem.id}
                                    className={`p-2 sm:p-3 border rounded-lg ${getStatusColor(status.status)}`}
                                >
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <div className="flex items-start gap-2 flex-1 min-w-0">
                                            {getStatusIcon(status.status)}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className="font-semibold text-sm sm:text-base">{status.checkItem.name}</p>
                                                    <span className={`text-xs px-2 py-0.5 rounded ${status.status === "checked" ? "bg-green-100 text-green-800" :
                                                        status.status === "needs_recheck" ? "bg-orange-100 text-orange-800" :
                                                            "bg-gray-100 text-gray-800"
                                                        }`}>
                                                        {getStatusLabel(status.status)}
                                                    </span>
                                                </div>
                                                {status.checkItem.description && (
                                                    <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
                                                        {status.checkItem.description}
                                                    </p>
                                                )}
                                                {status.status !== "unchecked" && status.checkedBy && (
                                                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                                        {getStatusLabel(status.status)}: {status.checkedBy.name || status.checkedBy.username} (
                                                        {status.checkedAt
                                                            ? format(new Date(status.checkedAt), "yyyy-MM-dd HH:mm")
                                                            : ""}
                                                        )
                                                    </p>
                                                )}
                                                {status.notes && (
                                                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                                        メモ: {status.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 flex-shrink-0 w-full sm:w-auto">
                                            <Button
                                                size="sm"
                                                onClick={() => onCheck(vehicle.id, status.checkItem.id, "checked")}
                                                className="w-full sm:w-auto text-[10px] sm:text-xs h-7 sm:h-8"
                                                variant={status.status === "checked" ? "default" : "outline"}
                                            >
                                                チェック
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onCheck(vehicle.id, status.checkItem.id, "needs_recheck")}
                                                className={`w-full sm:w-auto text-[10px] sm:text-xs h-7 sm:h-8 ${status.status === "needs_recheck"
                                                    ? "bg-orange-600 hover:bg-orange-700 text-white border-orange-600"
                                                    : ""
                                                    }`}
                                            >
                                                要再チェック
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onRequestCheck(vehicle.id, status.checkItem.id)}
                                                className="w-full sm:w-auto text-[10px] sm:text-xs h-7 sm:h-8"
                                            >
                                                チェック依頼する
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center py-4 text-[hsl(var(--muted-foreground))] text-sm">
                        チェック項目が設定されていません
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

export default function VehicleChecks() {
    const { user } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState<typeof CATEGORIES[number] | "all">("all");
    const [checkingVehicleId, setCheckingVehicleId] = useState<number | null>(null);
    const [checkingItemId, setCheckingItemId] = useState<number | null>(null);
    const [checkStatus, setCheckStatus] = useState<"checked" | "needs_recheck" | "unchecked">("checked");
    const [checkNotes, setCheckNotes] = useState("");
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [requestingVehicleId, setRequestingVehicleId] = useState<number | null>(null);
    const [requestingCheckItemId, setRequestingCheckItemId] = useState<number | undefined>(undefined);
    const [requestedToUserId, setRequestedToUserId] = useState("");
    const [requestMessage, setRequestMessage] = useState("");
    const [requestDueDate, setRequestDueDate] = useState("");

    const { data: vehicles } = trpc.vehicles.list.useQuery({});
    const { data: users } = trpc.users.list.useQuery(undefined, { enabled: user?.role === "admin" });
    const { data: myCheckRequests } = trpc.checks.getMyCheckRequests.useQuery();

    // カテゴリでフィルタリング
    const filteredVehicles = vehicles?.filter((v) => {
        if (selectedCategory === "all") return true;
        return v.category === selectedCategory;
    });

    const utils = trpc.useUtils();
    const checkMutation = trpc.checks.checkVehicle.useMutation({
        onSuccess: (_, variables) => {
            const statusLabel = variables.status === "checked" ? "チェック済み" : variables.status === "needs_recheck" ? "要再チェック" : "未チェック";
            toast.success(`${statusLabel}に更新しました`);
            setCheckingVehicleId(null);
            setCheckingItemId(null);
            setCheckStatus("checked");
            setCheckNotes("");
            // 全ての車両チェックデータを再取得
            utils.checks.getVehicleChecks.invalidate();
        },
        onError: (error) => {
            toast.error(error.message || "チェックの実行に失敗しました");
        },
    });

    const requestCheckMutation = trpc.checks.requestCheck.useMutation({
        onSuccess: () => {
            toast.success("チェック依頼を送信しました");
            setIsRequestDialogOpen(false);
            setRequestingVehicleId(null);
            setRequestingCheckItemId(undefined);
            setRequestedToUserId("");
            setRequestMessage("");
            setRequestDueDate("");
            utils.checks.getMyCheckRequests.invalidate();
        },
        onError: (error) => {
            toast.error(error.message || "チェック依頼の送信に失敗しました");
        },
    });

    const handleCheck = (vehicleId: number, itemId: number, status: "checked" | "needs_recheck" | "unchecked", notes?: string) => {
        checkMutation.mutate({
            vehicleId,
            checkItemId: itemId,
            status,
            notes: notes || undefined,
        });
    };

    const handleSubmitCheck = () => {
        if (!checkingVehicleId || !checkingItemId) return;

        checkMutation.mutate({
            vehicleId: checkingVehicleId,
            checkItemId: checkingItemId,
            status: checkStatus,
            notes: checkNotes || undefined,
        });
    };

    const handleRequestCheck = (vehicleId: number, checkItemId?: number) => {
        setRequestingVehicleId(vehicleId);
        setRequestingCheckItemId(checkItemId);
        setRequestDueDate("");
        setIsRequestDialogOpen(true);
    };

    const handleCheckAll = async (vehicleId: number, itemIds: number[]) => {
        if (itemIds.length === 0) {
            toast.info("チェックする項目がありません");
            return;
        }

        // 全ての未チェック項目を順番にチェック
        for (const itemId of itemIds) {
            try {
                await checkMutation.mutateAsync({
                    vehicleId,
                    checkItemId: itemId,
                    notes: undefined,
                });
            } catch (error) {
                console.error("チェックエラー:", error);
            }
        }
        toast.success(`${itemIds.length}件のチェックを完了しました`);
    };

    const handleSubmitRequest = (selectedCheckItemId?: number) => {
        if (!requestingVehicleId || !requestedToUserId) {
            toast.error("依頼先ユーザーを選択してください");
            return;
        }

        const checkItemIdToUse = selectedCheckItemId || requestingCheckItemId;
        if (!checkItemIdToUse) {
            toast.error("チェック項目を選択してください");
            return;
        }

        requestCheckMutation.mutate({
            vehicleId: requestingVehicleId,
            checkItemId: checkItemIdToUse,
            requestedTo: parseInt(requestedToUserId),
            dueDate: requestDueDate ? new Date(requestDueDate) : undefined,
            message: requestMessage || undefined,
        });
    };

    // 未完了のチェック依頼を取得
    const pendingCheckRequests = myCheckRequests?.filter((req) => req.status === "pending") || [];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold">車両チェック</h1>
                <p className="text-[hsl(var(--muted-foreground))] mt-2 text-sm sm:text-base">
                    登録された車両のチェック項目を確認・実行します
                </p>
            </div>

            {/* チェック依頼通知 */}
            {pendingCheckRequests.length > 0 && (
                <Card className="border-orange-200 bg-orange-50">
                    <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-orange-900 text-sm sm:text-base">
                                    チェック依頼が{pendingCheckRequests.length}件あります
                                </p>
                                <div className="mt-2 space-y-1">
                                    {pendingCheckRequests.slice(0, 3).map((request) => (
                                        <Link
                                            key={request.id}
                                            href={`/vehicles/${request.vehicleId}`}
                                            className="block text-xs sm:text-sm text-orange-800 hover:text-orange-900 underline"
                                        >
                                            {request.vehicle?.vehicleNumber || "車両ID: " + request.vehicleId} -{" "}
                                            {request.requestedByUser?.name || request.requestedByUser?.username || "不明"}
                                            さんから依頼
                                        </Link>
                                    ))}
                                    {pendingCheckRequests.length > 3 && (
                                        <p className="text-xs text-orange-700">
                                            他{pendingCheckRequests.length - 3}件の依頼があります
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* カテゴリタブ */}
            <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-1 sm:gap-2 overflow-x-auto">
                    <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">全て</TabsTrigger>
                    {CATEGORIES.map((cat) => (
                        <TabsTrigger key={cat} value={cat} className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap">
                            {cat}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value={selectedCategory} className="mt-4">
                    {filteredVehicles && filteredVehicles.length > 0 ? (
                        <div className="space-y-4">
                            {filteredVehicles.map((vehicle) => (
                                <VehicleCheckCard
                                    key={vehicle.id}
                                    vehicle={vehicle}
                                    onCheck={handleCheck}
                                    onRequestCheck={handleRequestCheck}
                                    onCheckAll={handleCheckAll}
                                    isAdmin={user?.role === "admin" || false}
                                    pendingRequests={pendingCheckRequests}
                                />
                            ))}
                        </div>
                    ) : (
                        <Card>
                            <CardContent className="p-4 text-center text-[hsl(var(--muted-foreground))]">
                                車両が登録されていません
                            </CardContent>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* チェック実行ダイアログ */}
            {checkingVehicleId && checkingItemId && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <Card className="w-full max-w-md min-w-0 my-auto">
                        <CardHeader className="p-3 sm:p-4 md:p-6">
                            <CardTitle className="text-base sm:text-lg md:text-xl">チェックを実行</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">チェック状態 *</label>
                                <select
                                    className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 sm:px-3 py-2 text-sm"
                                    value={checkStatus}
                                    onChange={(e) => setCheckStatus(e.target.value as "checked" | "needs_recheck" | "unchecked")}
                                >
                                    <option value="checked">チェック済み</option>
                                    <option value="needs_recheck">要再チェック</option>
                                    <option value="unchecked">未チェック</option>
                                </select>
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">メモ（任意）</label>
                                <Input
                                    value={checkNotes}
                                    onChange={(e) => setCheckNotes(e.target.value)}
                                    placeholder="メモを入力"
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button
                                    className="flex-1 w-full sm:w-auto"
                                    onClick={handleSubmitCheck}
                                    disabled={checkMutation.isPending}
                                >
                                    チェック完了
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 w-full sm:w-auto"
                                    onClick={() => {
                                        setCheckingVehicleId(null);
                                        setCheckingItemId(null);
                                        setCheckStatus("checked");
                                        setCheckNotes("");
                                    }}
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* チェック依頼ダイアログ */}
            {isRequestDialogOpen && requestingVehicleId && (
                <CheckRequestDialog
                    vehicleId={requestingVehicleId}
                    checkItemId={requestingCheckItemId}
                    users={users || []}
                    requestedToUserId={requestedToUserId}
                    setRequestedToUserId={setRequestedToUserId}
                    requestDueDate={requestDueDate}
                    setRequestDueDate={setRequestDueDate}
                    requestMessage={requestMessage}
                    setRequestMessage={setRequestMessage}
                    onSubmit={handleSubmitRequest}
                    onCancel={() => {
                        setIsRequestDialogOpen(false);
                        setRequestingVehicleId(null);
                        setRequestingCheckItemId(undefined);
                        setRequestedToUserId("");
                        setRequestMessage("");
                        setRequestDueDate("");
                    }}
                    isPending={requestCheckMutation.isPending}
                />
            )}
        </div>
    );
}

