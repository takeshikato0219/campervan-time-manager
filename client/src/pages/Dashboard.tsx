import { useState, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import TimelineCalendar from "../components/TimelineCalendar";
import { Plus, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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

    // データ更新用のコールバック
    const refreshData = useCallback(() => {
        console.log("[マイダッシュボード] データを更新します");
        utils.workRecords.getActive.invalidate();
        utils.workRecords.getTodayRecords.invalidate();
        utils.vehicles.list.invalidate();
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

    const clockInMutation = trpc.attendance.clockIn.useMutation({
        onSuccess: () => {
            toast.success("出勤しました");
            utils.attendance.getTodayStatus.invalidate();
        },
        onError: (error) => {
            toast.error(error.message || "出勤に失敗しました");
        },
    });

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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold">マイダッシュボード</h1>
                <p className="text-[hsl(var(--muted-foreground))] mt-2 text-sm sm:text-base">
                    こんにちは、{user?.name || user?.username}さん
                </p>
            </div>

            {/* 出退勤カード */}
            <Card>
                <CardHeader>
                    <CardTitle>出退勤</CardTitle>
                </CardHeader>
                <CardContent>
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
                            <Button onClick={() => clockInMutation.mutate({ deviceType: "pc" })}>
                                <Clock className="h-4 w-4 mr-2" />
                                出勤
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* 現在の作業 */}
            {activeWork && activeWork.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>現在の作業</CardTitle>
                    </CardHeader>
                    <CardContent>
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
            {todayRecords && todayRecords.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>今日の作業タイムライン</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <TimelineCalendar
                            workRecords={todayRecords.map((r) => ({
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

            {/* 今日の作業履歴 */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>今日の作業履歴</CardTitle>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setIsAddDialogOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            作業追加
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {todayRecords && todayRecords.length > 0 ? (
                        <div className="space-y-3">
                            {todayRecords.map((record) => (
                                <div
                                    key={record.id}
                                    className="flex items-center justify-between p-3 border border-[hsl(var(--border))] rounded-lg"
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
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle>作業記録を追加</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">日付</label>
                                <Input
                                    type="date"
                                    value={workDate}
                                    onChange={(e) => setWorkDate(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">車両</label>
                                <select
                                    key={`vehicle-${selectedVehicleId}`}
                                    className="flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                    value={selectedVehicleId}
                                    onChange={(e) => {
                                        e.preventDefault();
                                        setSelectedVehicleId(e.target.value);
                                    }}
                                >
                                    <option value="">選択してください</option>
                                    {vehicles?.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.vehicleNumber}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-sm font-medium">工程</label>
                                <select
                                    key={`process-${selectedProcessId}`}
                                    className="flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
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
                            <div>
                                <label className="text-sm font-medium">開始時刻</label>
                                <Input
                                    type="time"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium">終了時刻（任意）</label>
                                <Input
                                    type="time"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    onClick={handleAddWork}
                                    disabled={createWorkRecordMutation.isPending}
                                >
                                    追加
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
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

