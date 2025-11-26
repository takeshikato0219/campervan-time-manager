import { useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import TimelineCalendar from "../components/TimelineCalendar";
import { Plus, AlertCircle } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { format, startOfDay, endOfDay, isSameDay, subDays } from "date-fns";
import { useDateChangeDetector } from "../hooks/useDateChangeDetector";
import { useAutoRefresh } from "../hooks/useAutoRefresh";
import { usePageVisibility } from "../hooks/usePageVisibility";

export default function Dashboard() {
    const { user } = useAuth();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState("");
    const [selectedProcessId, setSelectedProcessId] = useState("");
    const [workDate, setWorkDate] = useState(() => {
        const today = new Date();
        return format(today, "yyyy-MM-dd");
    });
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");

    const utils = trpc.useUtils();
    const { data: activeWork } = trpc.workRecords.getActive.useQuery();
    const { data: todayRecords, refetch: refetchTodayRecords } =
        trpc.workRecords.getTodayRecords.useQuery();
    const { data: vehicles } = trpc.vehicles.list.useQuery({});
    const { data: processes } = trpc.processes.list.useQuery();
    const { data: todayAttendance } = trpc.attendance.getTodayStatus.useQuery();
    const { data: myCheckRequests } = trpc.checks.getMyCheckRequests.useQuery();
    const { data: unreadBroadcasts, refetch: refetchBroadcasts } = trpc.salesBroadcasts.getUnread.useQuery();
    const { data: bulletinMessages, refetch: refetchBulletin } = trpc.bulletin.list.useQuery();
    const { data: vehicleTypes } = trpc.vehicleTypes.list.useQuery();
    const [selectedVehicleTypeFilter, setSelectedVehicleTypeFilter] = useState<number | "all">("all");

    // 未完了のチェック依頼を取得
    const pendingCheckRequests = myCheckRequests?.filter((req) => req.status === "pending") || [];

    const markBroadcastAsReadMutation = trpc.salesBroadcasts.markAsRead.useMutation({
        onSuccess: () => {
            refetchBroadcasts();
        },
    });

    const createBulletinMutation = trpc.bulletin.create.useMutation({
        onSuccess: () => {
            toast.success("掲示板に投稿しました");
            refetchBulletin();
            setBulletinInput("");
        },
        onError: (error) => {
            toast.error(error.message || "掲示板への投稿に失敗しました");
        },
    });

    // データ更新用のコールバック
    const [bulletinInput, setBulletinInput] = useState("");

    const refreshData = useCallback(() => {
        console.log("[マイダッシュボード] データを更新します");
        utils.workRecords.getActive.invalidate();
        utils.workRecords.getTodayRecords.invalidate();
        utils.vehicles.list.invalidate();
        utils.bulletin.list.invalidate();
    }, [utils]);

    // 日付が変わったらデータを更新
    useDateChangeDetector(() => {
        console.log("[マイダッシュボード] 日付が変わりました。データを更新します。");
        refreshData();
    });

    // 1分ごとにデータを自動リフレッシュ
    useAutoRefresh(refreshData, 60 * 1000);

    // ページがアクティブになった時にデータを更新
    usePageVisibility(refreshData);

    const createWorkRecordMutation = trpc.workRecords.create.useMutation({
        onSuccess: () => {
            toast.success("作業記録を追加しました");
            setIsAddDialogOpen(false);
            refetchTodayRecords();
            setSelectedVehicleId("");
            setSelectedProcessId("");
            setStartTime("");
            setEndTime("");
        },
        onError: (error) => {
            toast.error(error.message || "作業記録の追加に失敗しました");
        },
    });

    // 出勤打刻は管理者専用のため、一般ユーザーは使用不可

    const handleAddWork = () => {
        if (!selectedVehicleId || !selectedProcessId || !workDate || !startTime) {
            toast.error("車両、工程、日付、開始時刻を入力してください");
            return;
        }

        const startDateTime = `${workDate}T${startTime}:00+09:00`;
        const endDateTime = endTime ? `${workDate}T${endTime}:00+09:00` : undefined;

        createWorkRecordMutation.mutate({
            userId: user!.id,
            vehicleId: parseInt(selectedVehicleId),
            processId: parseInt(selectedProcessId),
            startTime: startDateTime,
            endTime: endDateTime,
        });
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return "0分";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
    };

    const formatTime = (date: Date | string) => {
        const d = typeof date === "string" ? new Date(date) : date;
        return format(d, "HH:mm");
    };

    // 今日と昨日の作業記録を分ける
    const today = new Date();
    const yesterday = subDays(today, 1);
    const todayRecordsFiltered = todayRecords?.filter((record) => {
        const recordDate = typeof record.startTime === "string" ? new Date(record.startTime) : record.startTime;
        return isSameDay(recordDate, today);
    }) || [];
    const yesterdayRecords = todayRecords?.filter((record) => {
        const recordDate = typeof record.startTime === "string" ? new Date(record.startTime) : record.startTime;
        return isSameDay(recordDate, yesterday);
    }) || [];

    // 「作業追加」ダイアログを開くとき、直前の作業の終了時刻を開始時刻に自動セット
    const handleOpenAddDialog = () => {
        if (todayRecordsFiltered.length > 0) {
            // 終了時間が入っているレコードの中から一番新しいものを探す
            const lastWithEnd = [...todayRecordsFiltered]
                .filter((r) => r.endTime)
                .sort((a, b) => {
                    const aEnd = a.endTime ? new Date(a.endTime as any) : new Date(a.startTime as any);
                    const bEnd = b.endTime ? new Date(b.endTime as any) : new Date(b.startTime as any);
                    return aEnd.getTime() - bEnd.getTime();
                })
                .pop();

            if (lastWithEnd && lastWithEnd.endTime) {
                const end = typeof lastWithEnd.endTime === "string"
                    ? new Date(lastWithEnd.endTime)
                    : lastWithEnd.endTime;
                setWorkDate(format(end, "yyyy-MM-dd"));
                setStartTime(format(end, "HH:mm"));
            }
        }
        setIsAddDialogOpen(true);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold">マイダッシュボード</h1>
                <p className="text-[hsl(var(--muted-foreground))] mt-2 text-sm sm:text-base">
                    こんにちは、{user?.name || user?.username}さん
                </p>
            </div>

            {/* 全員向け掲示板（最新3件だけ表示） */}
            <Card>
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">全員向け掲示板</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                            value={bulletinInput}
                            onChange={(e) => setBulletinInput(e.target.value)}
                            placeholder="全員に共有したい一言メッセージを入力（3行程度）"
                            className="flex-1"
                        />
                        <Button
                            onClick={() => {
                                if (!bulletinInput.trim()) {
                                    toast.error("メッセージを入力してください");
                                    return;
                                }
                                createBulletinMutation.mutate({ message: bulletinInput.trim() });
                            }}
                            disabled={createBulletinMutation.isPending}
                            className="w-full sm:w-auto"
                        >
                            投稿
                        </Button>
                    </div>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                        {bulletinMessages && bulletinMessages.length > 0 ? (
                            bulletinMessages
                                .slice(0, 3)
                                .map((msg) => (
                                    <div key={msg.id} className="p-2 bg-[hsl(var(--muted))] rounded text-sm">
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="font-medium text-xs sm:text-sm">
                                                {msg.user?.name || msg.user?.username || "不明"} さん
                                            </span>
                                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                                                {format(new Date(msg.createdAt), "MM/dd HH:mm")}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-xs sm:text-sm whitespace-pre-wrap break-words">
                                            {msg.message}
                                        </p>
                                    </div>
                                ))
                        ) : (
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">まだ掲示板のメッセージはありません</p>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 営業からの拡散通知 */}
            {unreadBroadcasts && unreadBroadcasts.length > 0 && (
                <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p-4">
                        <div className="space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-blue-900 text-sm sm:text-base">
                                            営業からの拡散が{unreadBroadcasts.length}件あります
                                        </p>
                                    </div>
                                </div>
                                {vehicleTypes && vehicleTypes.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs sm:text-sm text-blue-900 font-medium">車種で絞り込み:</label>
                                        <select
                                            className="flex h-8 sm:h-10 text-xs sm:text-sm rounded-md border border-blue-300 bg-white px-2 sm:px-3 py-1 sm:py-2"
                                            value={selectedVehicleTypeFilter}
                                            onChange={(e) =>
                                                setSelectedVehicleTypeFilter(
                                                    e.target.value === "all" ? "all" : parseInt(e.target.value)
                                                )
                                            }
                                        >
                                            <option value="all">全て</option>
                                            {vehicleTypes.map((vt) => (
                                                <option key={vt.id} value={vt.id}>
                                                    {vt.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                {unreadBroadcasts
                                    .filter((broadcast) => {
                                        if (selectedVehicleTypeFilter === "all") return true;
                                        return (
                                            broadcast.vehicle?.vehicleTypeId === selectedVehicleTypeFilter
                                        );
                                    })
                                    .map((broadcast) => (
                                        <div
                                            key={broadcast.id}
                                            className="p-3 bg-white rounded-lg border border-blue-200"
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-semibold text-sm sm:text-base text-blue-900">
                                                            {broadcast.vehicle?.vehicleNumber || "車両ID: " + broadcast.vehicleId}
                                                        </p>
                                                        {broadcast.vehicle?.customerName && (
                                                            <p className="text-xs sm:text-sm text-blue-700">
                                                                ({broadcast.vehicle.customerName})
                                                            </p>
                                                        )}
                                                        {broadcast.vehicle?.vehicleType && (
                                                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                                                {broadcast.vehicle.vehicleType.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-blue-700 mt-1">
                                                        {broadcast.createdByUser?.name || broadcast.createdByUser?.username || "不明"}さんから
                                                    </p>
                                                    <p className="text-sm text-blue-800 mt-2 whitespace-pre-wrap">
                                                        {broadcast.message}
                                                    </p>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        markBroadcastAsReadMutation.mutate({ broadcastId: broadcast.id });
                                                    }}
                                                    className="flex-shrink-0"
                                                >
                                                    確認
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* チェック依頼通知（誰から・どの項目か分かるように表示） */}
            {pendingCheckRequests.length > 0 && (
                <Card className="border-orange-300 bg-orange-50">
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
                                            href="/vehicle-checks"
                                            className="block text-xs sm:text-sm text-orange-800 hover:text-orange-900"
                                        >
                                            <span className="font-semibold">
                                                {request.vehicle?.vehicleNumber || "車両ID: " + request.vehicleId}
                                            </span>
                                            <span className="ml-1">
                                                （
                                                {request.requestedByUser?.name ||
                                                    request.requestedByUser?.username ||
                                                    "不明"}
                                                さんから依頼）
                                            </span>
                                            {request.checkItem?.name && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[10px] sm:text-xs">
                                                    項目: {request.checkItem.name}
                                                </span>
                                            )}
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

            {/* 出退勤カード */}
            <Card>
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">出退勤</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    {todayAttendance ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">出勤時刻</p>
                                <p className="text-lg font-semibold">
                                    {formatTime(todayAttendance.clockIn)}
                                </p>
                            </div>
                            {todayAttendance.clockOut ? (
                                <div>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">退勤時刻</p>
                                    <p className="text-lg font-semibold">
                                        {formatTime(todayAttendance.clockOut)}
                                    </p>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
                                        勤務時間: {formatDuration(todayAttendance.workDuration)}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-orange-500">作業中</p>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-[hsl(var(--muted-foreground))] mb-4">まだ出勤していません</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2">
                                出勤は管理者が「出退勤管理」ページで行います
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 現在の作業 */}
            {activeWork && activeWork.length > 0 && (
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-xl">現在の作業</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        {activeWork.map((work) => (
                            <div key={work.id} className="space-y-2">
                                <p className="font-semibold">{work.vehicleNumber}</p>
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                    {work.processName} - {formatTime(work.startTime)}から作業中
                                </p>
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* タイムラインカレンダー */}
            {todayRecordsFiltered && todayRecordsFiltered.length > 0 && (
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-xl">今日の作業タイムライン</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 sm:p-6">
                        <TimelineCalendar
                            workRecords={todayRecordsFiltered.map((r) => ({
                                id: r.id,
                                startTime: typeof r.startTime === "string" ? r.startTime : r.startTime.toISOString(),
                                endTime: r.endTime
                                    ? typeof r.endTime === "string"
                                        ? r.endTime
                                        : r.endTime.toISOString()
                                    : null,
                                vehicleNumber: r.vehicleNumber || "不明",
                                processName: r.processName || "不明",
                                durationMinutes: r.durationMinutes,
                            }))}
                            date={new Date()}
                        />
                    </CardContent>
                </Card>
            )}

            {/* 昨日の作業履歴 */}
            {yesterdayRecords && yesterdayRecords.length > 0 && (
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-xl">昨日の作業履歴</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <div className="space-y-2 sm:space-y-3">
                            {yesterdayRecords.map((record) => (
                                <div
                                    key={record.id}
                                    className="flex items-center justify-between p-2 sm:p-3 border border-[hsl(var(--border))] rounded-lg bg-gray-50"
                                >
                                    <div>
                                        <p className="font-semibold">{record.vehicleNumber}</p>
                                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                            {record.processName}
                                        </p>
                                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                            {formatTime(record.startTime)}
                                            {record.endTime ? ` - ${formatTime(record.endTime)}` : " (作業中)"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">
                                            {formatDuration(record.durationMinutes)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 今日の作業履歴 */}
            <Card>
                <CardHeader className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-lg sm:text-xl">今日の作業履歴</CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={handleOpenAddDialog}
                            className="w-full sm:w-auto"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            作業追加
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    {todayRecordsFiltered && todayRecordsFiltered.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                            {todayRecordsFiltered.map((record) => (
                                <div
                                    key={record.id}
                                    className="flex items-center justify-between p-2 sm:p-3 border border-[hsl(var(--border))] rounded-lg"
                                >
                                    <div>
                                        <p className="font-semibold">{record.vehicleNumber}</p>
                                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                            {record.processName}
                                        </p>
                                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                            {formatTime(record.startTime)}
                                            {record.endTime ? ` - ${formatTime(record.endTime)}` : " (作業中)"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">
                                            {formatDuration(record.durationMinutes)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[hsl(var(--muted-foreground))] text-center py-4">
                            今日の作業記録はありません
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* 作業追加ダイアログ */}
            {isAddDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <Card className="w-full max-w-md min-w-0 my-auto">
                        <CardHeader className="p-3 sm:p-4 md:p-6">
                            <CardTitle className="text-base sm:text-lg md:text-xl">作業記録を追加</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">日付</label>
                                <Input
                                    type="date"
                                    value={workDate}
                                    onChange={(e) => setWorkDate(e.target.value)}
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">車両</label>
                                <select
                                    key={`vehicle-${selectedVehicleId}`}
                                    className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 sm:px-3 py-2 text-sm"
                                    value={selectedVehicleId}
                                    onChange={(e) => {
                                        e.preventDefault();
                                        setSelectedVehicleId(e.target.value);
                                    }}
                                >
                                    <option value="">選択してください</option>
                                    {vehicles?.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.vehicleNumber}{v.customerName ? ` - ${v.customerName}` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">工程</label>
                                <select
                                    key={`process-${selectedProcessId}`}
                                    className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 sm:px-3 py-2 text-sm"
                                    value={selectedProcessId}
                                    onChange={(e) => {
                                        e.preventDefault();
                                        setSelectedProcessId(e.target.value);
                                    }}
                                >
                                    <option value="">選択してください</option>
                                    {processes?.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">開始時刻</label>
                                <Input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">終了時刻</label>
                                <Input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button
                                    className="flex-1 w-full sm:w-auto"
                                    onClick={handleAddWork}
                                    disabled={createWorkRecordMutation.isPending}
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
        </div>
    );
}

