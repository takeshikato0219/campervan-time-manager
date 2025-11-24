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

// 車両チェックカードコンポーネント
function VehicleCheckCard({
    vehicle,
    onCheck,
    onRequestCheck,
    isAdmin,
    pendingRequests,
}: {
    vehicle: any;
    onCheck: (vehicleId: number, itemId: number) => void;
    onRequestCheck: (vehicleId: number) => void;
    isAdmin: boolean;
    pendingRequests: any[];
}) {
    const { data: checkData } = trpc.checks.getVehicleChecks.useQuery({
        vehicleId: vehicle.id,
    });

    const pendingRequestsForVehicle = pendingRequests.filter((req) => req.vehicleId === vehicle.id);

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
                    {isAdmin && (
                        <Button size="sm" variant="outline" onClick={() => onRequestCheck(vehicle.id)}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            依頼
                        </Button>
                    )}
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
                        {checkData.checkStatus.map((status: any) => (
                            <div
                                key={status.checkItem.id}
                                className={`p-2 sm:p-3 border rounded-lg ${
                                    status.checked ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
                                }`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                    <div className="flex items-start gap-2 flex-1 min-w-0">
                                        {status.checked ? (
                                            <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0 mt-0.5" />
                                        ) : (
                                            <div className="h-4 w-4 sm:h-5 sm:w-5 border-2 border-gray-300 rounded flex-shrink-0 mt-0.5" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm sm:text-base">{status.checkItem.name}</p>
                                            {status.checkItem.description && (
                                                <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
                                                    {status.checkItem.description}
                                                </p>
                                            )}
                                            {status.checked && status.checkedBy && (
                                                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                                    チェック済み: {status.checkedBy.name || status.checkedBy.username} (
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
                                    {!status.checked && (
                                        <Button
                                            size="sm"
                                            onClick={() => onCheck(vehicle.id, status.checkItem.id)}
                                            className="w-full sm:w-auto flex-shrink-0"
                                        >
                                            チェック
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
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
    const [checkNotes, setCheckNotes] = useState("");
    const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
    const [requestingVehicleId, setRequestingVehicleId] = useState<number | null>(null);
    const [requestedToUserId, setRequestedToUserId] = useState("");
    const [requestMessage, setRequestMessage] = useState("");

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
        onSuccess: () => {
            toast.success("チェックを完了しました");
            setCheckingVehicleId(null);
            setCheckingItemId(null);
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
            setRequestedToUserId("");
            setRequestMessage("");
        },
        onError: (error) => {
            toast.error(error.message || "チェック依頼の送信に失敗しました");
        },
    });

    const handleCheck = (vehicleId: number, itemId: number) => {
        setCheckingVehicleId(vehicleId);
        setCheckingItemId(itemId);
        setCheckNotes("");
    };

    const handleSubmitCheck = () => {
        if (!checkingVehicleId || !checkingItemId) return;

        checkMutation.mutate({
            vehicleId: checkingVehicleId,
            checkItemId: checkingItemId,
            notes: checkNotes || undefined,
        });
    };

    const handleRequestCheck = (vehicleId: number) => {
        setRequestingVehicleId(vehicleId);
        setIsRequestDialogOpen(true);
    };

    const handleSubmitRequest = () => {
        if (!requestingVehicleId || !requestedToUserId) {
            toast.error("依頼先ユーザーを選択してください");
            return;
        }

        requestCheckMutation.mutate({
            vehicleId: requestingVehicleId,
            requestedTo: parseInt(requestedToUserId),
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
                <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                    <TabsTrigger value="all" className="text-xs sm:text-sm">全て</TabsTrigger>
                    {CATEGORIES.map((cat) => (
                        <TabsTrigger key={cat} value={cat} className="text-xs sm:text-sm">
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <Card className="w-full max-w-md min-w-0 my-auto">
                        <CardHeader className="p-3 sm:p-4 md:p-6">
                            <CardTitle className="text-base sm:text-lg md:text-xl">チェック依頼</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">依頼先ユーザー *</label>
                                <select
                                    className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 sm:px-3 py-2 text-sm"
                                    value={requestedToUserId}
                                    onChange={(e) => setRequestedToUserId(e.target.value)}
                                >
                                    <option value="">選択してください</option>
                                    {users?.map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name || u.username}
                                        </option>
                                    ))}
                                </select>
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
                                    onClick={handleSubmitRequest}
                                    disabled={requestCheckMutation.isPending}
                                >
                                    依頼送信
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 w-full sm:w-auto"
                                    onClick={() => {
                                        setIsRequestDialogOpen(false);
                                        setRequestingVehicleId(null);
                                        setRequestedToUserId("");
                                        setRequestMessage("");
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

