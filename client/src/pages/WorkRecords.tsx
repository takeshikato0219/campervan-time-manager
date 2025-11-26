import { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Plus, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function WorkRecords() {
    const { user } = useAuth();
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [selectedVehicleId, setSelectedVehicleId] = useState("");
    const [selectedProcessId, setSelectedProcessId] = useState("");
    const [workDate, setWorkDate] = useState(() => {
        const today = new Date();
        return format(today, "yyyy-MM-dd");
    });
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [editingRecord, setEditingRecord] = useState<{
        id: number;
        vehicleId: string;
        processId: string;
        workDate: string;
        startTime: string;
        endTime: string;
        workDescription: string;
    } | null>(null);

    const { data: workRecords, refetch } = trpc.workRecords.getTodayRecords.useQuery();
    const { data: vehicles } = trpc.vehicles.list.useQuery({});
    const { data: processes } = trpc.processes.list.useQuery();

    const createWorkRecordMutation = trpc.workRecords.create.useMutation({
        onSuccess: () => {
            toast.success("作業記録を追加しました");
            setIsAddDialogOpen(false);
            refetch();
            setSelectedVehicleId("");
            setSelectedProcessId("");
            setStartTime("");
            setEndTime("");
        },
        onError: (error) => {
            toast.error(error.message || "作業記録の追加に失敗しました");
        },
    });

    const updateWorkRecordMutation = trpc.workRecords.updateMyRecord.useMutation({
        onSuccess: () => {
            toast.success("作業記録を更新しました");
            setIsEditDialogOpen(false);
            setEditingRecord(null);
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "作業記録の更新に失敗しました");
        },
    });

    const deleteWorkRecordMutation = trpc.workRecords.deleteMyRecord.useMutation({
        onSuccess: () => {
            toast.success("作業記録を削除しました");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "作業記録の削除に失敗しました");
        },
    });

    // 「作業追加」ダイアログを開くとき、
    // 1件目: 開始時刻デフォルト 8:35
    // 2件目以降: 直前の作業の終了時刻を開始時刻に自動セット
    const handleOpenAddDialog = () => {
        const now = new Date();
        const todayStr = format(now, "yyyy-MM-dd");

        // デフォルトは今日の 8:35 にする
        let nextDate = todayStr;
        let nextStart = "08:35";

        if (workRecords && workRecords.length > 0) {
            const lastWithEnd = [...workRecords]
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
                nextDate = format(end, "yyyy-MM-dd");
                nextStart = format(end, "HH:mm");
            }
        }

        setWorkDate(nextDate);
        setStartTime(nextStart);
        setEndTime("");
        setSelectedVehicleId("");
        setSelectedProcessId("");
        setIsAddDialogOpen(true);
    };

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

    const handleEdit = (record: any) => {
        const startDate = new Date(record.startTime);
        const endDate = record.endTime ? new Date(record.endTime) : new Date();

        setEditingRecord({
            id: record.id,
            vehicleId: record.vehicleId.toString(),
            processId: record.processId.toString(),
            workDate: format(startDate, "yyyy-MM-dd"),
            startTime: format(startDate, "HH:mm"),
            endTime: record.endTime ? format(endDate, "HH:mm") : "",
            workDescription: record.workDescription || "",
        });
        setIsEditDialogOpen(true);
    };

    const handleSaveEdit = () => {
        if (!editingRecord) return;

        if (!editingRecord.vehicleId || !editingRecord.processId || !editingRecord.workDate || !editingRecord.startTime) {
            toast.error("車両、工程、日付、開始時刻を入力してください");
            return;
        }

        const startDateTime = `${editingRecord.workDate}T${editingRecord.startTime}:00+09:00`;
        const endDateTime = editingRecord.endTime
            ? `${editingRecord.workDate}T${editingRecord.endTime}:00+09:00`
            : undefined;

        updateWorkRecordMutation.mutate({
            id: editingRecord.id,
            vehicleId: parseInt(editingRecord.vehicleId),
            processId: parseInt(editingRecord.processId),
            startTime: startDateTime,
            endTime: endDateTime,
            workDescription: editingRecord.workDescription || undefined,
        });
    };

    const handleDelete = (id: number) => {
        if (window.confirm("本当にこの作業記録を削除しますか？")) {
            deleteWorkRecordMutation.mutate({ id });
        }
    };

    const formatTime = (date: Date | string) => {
        const d = typeof date === "string" ? new Date(date) : date;
        return format(d, "HH:mm");
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return "0分";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">作業記録管理</h1>
                    <p className="text-[hsl(var(--muted-foreground))] mt-2 text-sm sm:text-base">
                        自分の作業記録を確認・追加します
                    </p>
                </div>
                <Button onClick={handleOpenAddDialog} className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 mr-2" />
                    作業追加
                </Button>
            </div>

            <Card>
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">今日の作業記録</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    {workRecords && workRecords.length > 0 ? (
                        <div className="space-y-2 sm:space-y-3">
                            {workRecords.map((record) => (
                                <div
                                    key={record.id}
                                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-2 sm:p-3 border border-[hsl(var(--border))] rounded-lg"
                                >
                                    <div className="flex-1">
                                        <p className="font-semibold text-base">{record.vehicleNumber}</p>
                                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                            {record.processName}
                                        </p>
                                        <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                            {formatTime(record.startTime)}
                                            {record.endTime ? ` - ${formatTime(record.endTime)}` : " (作業中)"}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                                        <div className="text-right sm:text-left">
                                            <p className="font-semibold text-sm sm:text-base">{formatDuration(record.durationMinutes)}</p>
                                        </div>
                                        <div className="flex gap-1 sm:gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleEdit(record)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleDelete(record.id)}
                                                disabled={deleteWorkRecordMutation.isPending}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
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

            {/* 作業編集ダイアログ */}
            {isEditDialogOpen && editingRecord && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4 overflow-y-auto">
                    <Card className="w-full max-w-md min-w-0 my-auto">
                        <CardHeader className="p-3 sm:p-4 md:p-6">
                            <CardTitle className="text-base sm:text-lg md:text-xl">作業記録を編集</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">日付</label>
                                <Input
                                    type="date"
                                    value={editingRecord.workDate}
                                    onChange={(e) =>
                                        setEditingRecord({ ...editingRecord, workDate: e.target.value })
                                    }
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">車両</label>
                                <select
                                    key={`edit-vehicle-${editingRecord.vehicleId}`}
                                    className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 sm:px-3 py-2 text-sm"
                                    value={editingRecord.vehicleId}
                                    onChange={(e) => {
                                        e.preventDefault();
                                        setEditingRecord({ ...editingRecord, vehicleId: e.target.value });
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
                                    key={`edit-process-${editingRecord.processId}`}
                                    className="flex h-10 w-full min-w-0 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-2 sm:px-3 py-2 text-sm"
                                    value={editingRecord.processId}
                                    onChange={(e) => {
                                        e.preventDefault();
                                        setEditingRecord({ ...editingRecord, processId: e.target.value });
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
                                    value={editingRecord.startTime}
                                    onChange={(e) =>
                                        setEditingRecord({ ...editingRecord, startTime: e.target.value })
                                    }
                                    required
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">終了時刻</label>
                                <Input
                                    type="time"
                                    value={editingRecord.endTime}
                                    onChange={(e) =>
                                        setEditingRecord({ ...editingRecord, endTime: e.target.value })
                                    }
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="min-w-0">
                                <label className="text-sm font-medium block mb-1">作業内容（任意）</label>
                                <Input
                                    type="text"
                                    value={editingRecord.workDescription}
                                    onChange={(e) =>
                                        setEditingRecord({ ...editingRecord, workDescription: e.target.value })
                                    }
                                    placeholder="作業内容を入力"
                                    className="w-full min-w-0"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2 pt-2">
                                <Button
                                    className="flex-1 w-full sm:w-auto"
                                    onClick={handleSaveEdit}
                                    disabled={updateWorkRecordMutation.isPending}
                                >
                                    保存
                                </Button>
                                <Button
                                    variant="outline"
                                    className="flex-1 w-full sm:w-auto"
                                    onClick={() => {
                                        setIsEditDialogOpen(false);
                                        setEditingRecord(null);
                                    }}
                                >
                                    キャンセル
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

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

