import { useState, useEffect, useMemo } from "react";
import { trpc } from "../../lib/trpc";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Edit, Monitor, Smartphone, Plus, History } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";

interface StaffAttendanceListProps {
    selectedDate: Date;
}

export default function StaffAttendanceList({ selectedDate }: StaffAttendanceListProps) {
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editClockIn, setEditClockIn] = useState("");
    const [editClockOut, setEditClockOut] = useState("");
    const [showEditLogs, setShowEditLogs] = useState<number | null>(null);

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    // リアルタイムで今日かどうかを判定（1分ごとに更新）
    const [currentDate, setCurrentDate] = useState(new Date());
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDate(new Date());
        }, 60000); // 1分ごとに更新
        return () => clearInterval(interval);
    }, []);

    const isToday = useMemo(() => {
        return format(selectedDate, "yyyy-MM-dd") === format(currentDate, "yyyy-MM-dd");
    }, [selectedDate, currentDate]);

    // 今日の場合はgetAllStaffToday、それ以外はgetAllStaffByDateを使用
    const {
        data: staffListToday,
        isLoading: isLoadingToday,
        error: errorToday
    } = trpc.attendance.getAllStaffToday.useQuery(
        undefined,
        { enabled: isToday }
    );
    const {
        data: staffListByDate,
        isLoading: isLoadingByDate,
        error: errorByDate
    } = trpc.attendance.getAllStaffByDate.useQuery(
        { date: dateStr },
        { enabled: !isToday }
    );

    const staffList = isToday ? staffListToday : staffListByDate;
    const isLoading = isToday ? isLoadingToday : isLoadingByDate;
    const error = isToday ? errorToday : errorByDate;

    const utils = trpc.useUtils();

    // 出退勤編集は「毎回サーバーから取り直す」安全な方式（他のカードが巻き込まれておかしくなるのを防ぐ）
    const updateMutation = trpc.attendance.updateAttendance.useMutation({
        onSuccess: () => {
            toast.success("出退勤記録を更新しました");
            // サーバーの確定値で一覧を再取得
            if (isToday) {
                utils.attendance.getAllStaffToday.invalidate();
            } else {
                utils.attendance.getAllStaffByDate.invalidate({ date: dateStr });
            }
            setEditingId(null);
        },
        onError: (error) => {
            toast.error(error.message || "更新に失敗しました");
        },
    });

    // 出退勤記録の削除（サーバー側で1件削除してから一覧を再取得）
    const deleteMutation = trpc.attendance.deleteAttendance.useMutation({
        onSuccess: () => {
            toast.success("出退勤記録を削除しました");
            if (isToday) {
                utils.attendance.getAllStaffToday.invalidate();
            } else {
                utils.attendance.getAllStaffByDate.invalidate({ date: dateStr });
            }
        },
        onError: (error) => {
            toast.error(error.message || "削除に失敗しました");
        },
    });

    // 安全性のため、物理削除は無効化（バックエンド側でも禁止）

    const adminClockInMutation = trpc.attendance.adminClockIn.useMutation({
        onSuccess: () => {
            toast.success("出勤を打刻しました");
            if (isToday) {
                utils.attendance.getAllStaffToday.invalidate();
            } else {
                utils.attendance.getAllStaffByDate.invalidate();
            }
        },
        onError: (error) => {
            toast.error(error.message || "出勤打刻に失敗しました");
        },
    });

    const adminClockOutMutation = trpc.attendance.adminClockOut.useMutation({
        onSuccess: () => {
            toast.success("退勤を打刻しました");
            if (isToday) {
                utils.attendance.getAllStaffToday.invalidate();
            } else {
                utils.attendance.getAllStaffByDate.invalidate();
            }
        },
        onError: (error) => {
            toast.error(error.message || "退勤打刻に失敗しました");
        },
    });

    // 編集ログを取得
    const { data: editLogs } = trpc.attendance.getEditLogs.useQuery(
        { attendanceId: showEditLogs || undefined },
        { enabled: showEditLogs !== null }
    );

    const handleEdit = (attendance: any) => {
        setEditingId(attendance.id);
        setEditClockIn(format(new Date(attendance.clockIn), "HH:mm"));
        setEditClockOut(attendance.clockOut ? format(new Date(attendance.clockOut), "HH:mm") : "");
    };

    const handleSave = (attendanceId: number) => {
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const clockInDateTime = editClockIn ? `${dateStr}T${editClockIn}:00+09:00` : undefined;
        // editClockOutが空文字列の場合はundefinedを送信（サーバー側で既存値を維持 or null処理）
        const clockOutDateTime =
            editClockOut === ""
                ? undefined
                : editClockOut
                    ? `${dateStr}T${editClockOut}:00+09:00`
                    : undefined;

        updateMutation.mutate({
            attendanceId,
            clockIn: clockInDateTime,
            clockOut: clockOutDateTime,
        });
    };

    const handleDelete = (attendanceId: number) => {
        if (confirm("本当にこの出退勤記録を削除しますか？")) {
            deleteMutation.mutate({ attendanceId });
        }
    };

    const getDeviceIcon = (device: string | null) => {
        if (!device) return null;
        if (device === "mobile") {
            return <Smartphone className="h-4 w-4 text-blue-500" />;
        } else if (device === "pc") {
            return <Monitor className="h-4 w-4 text-green-500" />;
        }
        return null;
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return "0分";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
    };

    const handleAdminClockIn = (userId: number) => {
        // 現在時刻を自動的に設定
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const clockInDateTime = `${dateStr}T${hours}:${minutes}:00+09:00`;
        adminClockInMutation.mutate({
            userId,
            clockIn: clockInDateTime,
            deviceType: "pc",
        });
    };

    const handleAdminClockOut = (userId: number) => {
        // 現在時刻を自動的に設定
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const dateStr = format(selectedDate, "yyyy-MM-dd");
        const clockOutDateTime = `${dateStr}T${hours}:${minutes}:00+09:00`;
        console.log("退勤打刻:", { userId, clockOutDateTime });
        adminClockOutMutation.mutate({
            userId,
            clockOut: clockOutDateTime,
        });
    };

    if (isLoading) {
        return <div className="text-center py-4">読み込み中...</div>;
    }

    if (error) {
        return (
            <div className="text-center py-8 text-red-500">
                <p>エラーが発生しました</p>
                <p className="text-sm mt-2">{error.message}</p>
            </div>
        );
    }

    if (!staffList) {
        return (
            <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                <p>データが取得できませんでした</p>
                <p className="text-xs mt-2">日付: {dateStr}</p>
            </div>
        );
    }

    if (staffList.length === 0) {
        return (
            <div className="text-center py-8 text-[hsl(var(--muted-foreground))]">
                <p>スタッフが見つかりません</p>
                <p className="text-xs mt-2">日付: {dateStr}</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
            {staffList.map((staff) => (
                <div key={staff.userId} className="contents">
                    <Card className="h-full">
                        <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                            <div>
                                <p className="font-semibold text-sm sm:text-base truncate">{staff.userName}</p>
                                {staff.attendance ? (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            {getDeviceIcon(staff.attendance.clockInDevice)}
                                            <div>
                                                <p className="text-xs text-[hsl(var(--muted-foreground))]">出勤</p>
                                                <p className="text-sm font-medium">
                                                    {format(new Date(staff.attendance.clockIn), "HH:mm")}
                                                </p>
                                            </div>
                                        </div>
                                        {staff.attendance.clockOut ? (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    {getDeviceIcon(staff.attendance.clockOutDevice)}
                                                    <div>
                                                        <p className="text-xs text-[hsl(var(--muted-foreground))]">退勤</p>
                                                        <p className="text-sm font-medium">
                                                            {format(new Date(staff.attendance.clockOut), "HH:mm")}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">勤務時間</p>
                                                    <p className="text-sm font-medium">
                                                        {formatDuration(staff.attendance.workDuration)}
                                                    </p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="space-y-2">
                                                <span className="inline-block px-2 py-1 text-xs font-medium text-orange-500 bg-orange-50 rounded">
                                                    作業中
                                                </span>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full text-xs sm:text-sm min-h-[44px]"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleAdminClockOut(staff.userId);
                                                    }}
                                                >
                                                    <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                    退勤
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <p className="text-sm text-[hsl(var(--muted-foreground))]">未出勤</p>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-xs sm:text-sm min-h-[44px]"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleAdminClockIn(staff.userId);
                                            }}
                                        >
                                            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                            出勤
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-1 sm:gap-2 pt-2 border-t border-[hsl(var(--border))]">
                                {staff.attendance ? (
                                    <>
                                        {editingId === staff.attendance.id ? (
                                            <div className="w-full space-y-2">
                                                <Input
                                                    type="time"
                                                    value={editClockIn}
                                                    onChange={(e) => setEditClockIn(e.target.value)}
                                                    className="w-full"
                                                    placeholder="出勤時刻"
                                                />
                                                <Input
                                                    type="time"
                                                    value={editClockOut}
                                                    onChange={(e) => setEditClockOut(e.target.value)}
                                                    className="w-full"
                                                    placeholder="退勤時刻"
                                                />
                                                <div className="flex gap-1 sm:gap-2">
                                                    <Button
                                                        size="sm"
                                                        className="flex-1 text-xs sm:text-sm min-h-[44px]"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleSave(staff.attendance!.id);
                                                        }}
                                                        disabled={updateMutation.isPending}
                                                    >
                                                        保存
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="flex-1 text-xs sm:text-sm min-h-[44px]"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setEditingId(null);
                                                        }}
                                                    >
                                                        キャンセル
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="flex-1 text-xs sm:text-sm min-h-[44px]"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            handleDelete(staff.attendance!.id);
                                                        }}
                                                    >
                                                        削除
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-1 text-xs sm:text-sm min-h-[44px]"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleEdit(staff.attendance!);
                                                    }}
                                                >
                                                    <Edit className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                    編集
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="flex-1 text-xs sm:text-sm min-h-[44px]"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        setShowEditLogs(
                                                            showEditLogs === staff.attendance!.id
                                                                ? null
                                                                : staff.attendance!.id
                                                        );
                                                    }}
                                                >
                                                    <History className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                                    履歴
                                                </Button>
                                            </>
                                        )}
                                    </>
                                ) : null}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 編集ログ表示（各スタッフの下に表示） */}
                    {staff.attendance && showEditLogs === staff.attendance.id && editLogs && (
                        <div className="col-span-full">
                            <Card className="mt-2">
                                <CardHeader>
                                    <CardTitle className="text-lg">
                                        {staff.userName}の編集履歴
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {editLogs
                                            .filter((log) => log.attendanceId === staff.attendance!.id)
                                            .map((log) => (
                                                <div
                                                    key={log.id}
                                                    className="text-sm border-b border-[hsl(var(--border))] pb-2"
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-medium">{log.userName}</span>
                                                        <span className="text-xs text-[hsl(var(--muted-foreground))]">
                                                            {format(new Date(log.createdAt), "yyyy-MM-dd HH:mm")}
                                                        </span>
                                                    </div>
                                                    <div className="text-[hsl(var(--muted-foreground))]">
                                                        <span className="font-medium">{log.editorName}</span>が
                                                        <span className="mx-1">
                                                            {log.fieldName === "clockIn"
                                                                ? "出勤時刻"
                                                                : log.fieldName === "clockOut"
                                                                    ? "退勤時刻"
                                                                    : log.fieldName}
                                                        </span>
                                                        を変更
                                                    </div>
                                                    <div className="text-xs">
                                                        {log.oldValue && (
                                                            <span>
                                                                変更前:{" "}
                                                                {format(new Date(log.oldValue), "HH:mm")}
                                                            </span>
                                                        )}
                                                        {log.newValue && (
                                                            <span className="ml-2">
                                                                変更後:{" "}
                                                                {format(new Date(log.newValue), "HH:mm")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            ))}

        </div>
    );
}

