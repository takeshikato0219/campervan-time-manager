import React, { useState } from "react";
import { useRoute } from "wouter";
import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { ArrowLeft, Play, Square, Plus } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Link } from "wouter";

export default function VehicleDetail() {
    const [, params] = useRoute("/vehicles/:id");
    const vehicleId = params ? parseInt(params.id) : 0;
    const { user } = useAuth();

    const { data: vehicle, refetch } = trpc.vehicles.get.useQuery({ id: vehicleId });
    const { data: processes } = trpc.processes.list.useQuery();
    const { data: activeWork, refetch: refetchActiveWork } = trpc.workRecords.getActive.useQuery();

    const [isWorkDialogOpen, setIsWorkDialogOpen] = useState(false);
    const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);
    const [workDescription, setWorkDescription] = useState("");

    const startWorkMutation = trpc.workRecords.start.useMutation({
        onSuccess: () => {
            toast.success("作業を開始しました");
            setIsWorkDialogOpen(false);
            setSelectedProcessId(null);
            setWorkDescription("");
            refetch();
            refetchActiveWork();
        },
        onError: (error) => {
            toast.error(error.message || "作業開始に失敗しました");
        },
    });

    const stopWorkMutation = trpc.workRecords.stop.useMutation({
        onSuccess: () => {
            toast.success("作業を終了しました");
            refetch();
            refetchActiveWork();
        },
        onError: (error) => {
            toast.error(error.message || "作業終了に失敗しました");
        },
    });

    const handleStartWork = () => {
        if (!selectedProcessId) {
            toast.error("工程を選択してください");
            return;
        }

        startWorkMutation.mutate({
            vehicleId,
            processId: selectedProcessId,
            workDescription: workDescription.trim() || undefined,
        });
    };

    const handleStopWork = (workRecordId: number) => {
        stopWorkMutation.mutate({ id: workRecordId });
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return "0分";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
    };

    if (!vehicle) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div>読み込み中...</div>
            </div>
        );
    }

    // 作業中の記録を取得
    const activeWorkForVehicle = activeWork?.filter((w) => w.vehicleId === vehicleId) || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/vehicles">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        戻る
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">{vehicle.vehicleNumber}</h1>
                    <p className="text-[hsl(var(--muted-foreground))] mt-1">
                        {vehicle.customerName || "お客様名未設定"}
                    </p>
                </div>
            </div>

            {/* 車両情報 */}
            <Card>
                <CardHeader>
                    <CardTitle>車両情報</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">ステータス</p>
                            <p className="font-semibold">
                                {vehicle.status === "in_progress"
                                    ? "作業中"
                                    : vehicle.status === "completed"
                                        ? "完成"
                                        : "保管"}
                            </p>
                        </div>
                        {vehicle.desiredDeliveryDate && (
                            <div>
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">希望納期</p>
                                <p className="font-semibold">
                                    {format(new Date(vehicle.desiredDeliveryDate), "yyyy年MM月dd日")}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* 工程別作業時間 */}
            <Card>
                <CardHeader>
                    <CardTitle>工程別作業時間</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    {processes?.map((process) => {
                        const processTime = vehicle.processTime?.find((p) => p.processId === process.id);
                        const actualMinutes = processTime?.minutes || 0;
                        const isWorking = activeWorkForVehicle.some((w) => w.processId === process.id);

                        return (
                            <div key={process.id} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="font-medium">{process.name}</span>
                                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                                        {formatDuration(actualMinutes)}
                                    </span>
                                </div>
                                {isWorking ? (
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                            handleStopWork(
                                                activeWorkForVehicle.find((w) => w.processId === process.id)!.id
                                            )
                                        }
                                    >
                                        <Square className="h-4 w-4 mr-2" />
                                        作業終了
                                    </Button>
                                ) : (
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setSelectedProcessId(process.id);
                                            setIsWorkDialogOpen(true);
                                        }}
                                    >
                                        <Play className="h-4 w-4 mr-2" />
                                        作業開始
                                    </Button>
                                )}
                            </div>
                        );
                    })}
                </CardContent>
            </Card>

            {/* 作業履歴 */}
            <Card>
                <CardHeader>
                    <CardTitle>作業履歴</CardTitle>
                </CardHeader>
                <CardContent>
                    {vehicle.workRecords && vehicle.workRecords.length > 0 ? (
                        <div className="space-y-2">
                            {vehicle.workRecords.map((record) => (
                                <div
                                    key={record.id}
                                    className="flex items-center justify-between p-3 border border-[hsl(var(--border))] rounded-lg"
                                >
                                    <div>
                                        <p className="font-semibold">{record.processName}</p>
                                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                            {record.userName} - {format(new Date(record.startTime), "yyyy-MM-dd HH:mm")}
                                            {record.endTime
                                                ? ` - ${format(new Date(record.endTime), "HH:mm")}`
                                                : " (作業中)"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-semibold">{formatDuration(record.durationMinutes)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center py-4 text-[hsl(var(--muted-foreground))]">
                            作業記録がありません
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* メモ */}
            <Card>
                <CardHeader>
                    <CardTitle>メモ</CardTitle>
                </CardHeader>
                <CardContent>
                    {vehicle.memos && vehicle.memos.length > 0 ? (
                        <div className="space-y-2">
                            {vehicle.memos.map((memo) => (
                                <div
                                    key={memo.id}
                                    className="border-b border-[hsl(var(--border))] pb-2"
                                >
                                    <p className="text-sm">{memo.content}</p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                        {format(new Date(memo.createdAt), "yyyy-MM-dd HH:mm")} - {memo.userName}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center py-4 text-[hsl(var(--muted-foreground))]">
                            メモがありません
                        </p>
                    )}
                </CardContent>
            </Card>

            {/* 作業開始ダイアログ */}
            {isWorkDialogOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md mx-4">
                        <CardHeader>
                            <CardTitle>作業を開始</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">工程</label>
                                <select
                                    className="flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                    value={selectedProcessId || ""}
                                    onChange={(e) => setSelectedProcessId(parseInt(e.target.value))}
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
                                <label className="text-sm font-medium">作業内容（任意）</label>
                                <textarea
                                    className="flex min-h-[80px] w-full rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3 py-2 text-sm"
                                    value={workDescription}
                                    onChange={(e) => setWorkDescription(e.target.value)}
                                    placeholder="作業内容を入力..."
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    onClick={handleStartWork}
                                    disabled={startWorkMutation.isPending || !selectedProcessId}
                                >
                                    開始
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setIsWorkDialogOpen(false);
                                        setSelectedProcessId(null);
                                        setWorkDescription("");
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

