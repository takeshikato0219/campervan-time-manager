import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { trpc } from "../../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CSVExport() {
    const { user } = useAuth();

    // 管理者のみアクセス可能
    if (user?.role !== "admin") {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="text-center">
                    <p className="text-lg font-semibold">アクセス権限がありません</p>
                    <p className="text-[hsl(var(--muted-foreground))] mt-2">
                        このページは管理者のみがアクセスできます
                    </p>
                </div>
            </div>
        );
    }

    const formatDateForInput = (date: Date) => {
        return format(date, "yyyy-MM-dd");
    };

    const [attendanceStartDate, setAttendanceStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return formatDateForInput(date);
    });
    const [attendanceEndDate, setAttendanceEndDate] = useState(() => formatDateForInput(new Date()));

    const [workRecordStartDate, setWorkRecordStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return formatDateForInput(date);
    });
    const [workRecordEndDate, setWorkRecordEndDate] = useState(() => formatDateForInput(new Date()));

    const exportAttendanceMutation = trpc.csv.exportAttendance.useMutation({
        onSuccess: (data) => {
            const bom = "\uFEFF";
            const csvContent = bom + data.csv;
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `出退勤記録_${attendanceStartDate}_${attendanceEndDate}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("CSVファイルをダウンロードしました");
        },
        onError: (error) => {
            toast.error(error.message || "CSV出力に失敗しました");
        },
    });

    const exportWorkRecordsMutation = trpc.csv.exportWorkRecords.useMutation({
        onSuccess: (data) => {
            const bom = "\uFEFF";
            const csvContent = bom + data.csv;
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `作業記録_${workRecordStartDate}_${workRecordEndDate}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("CSVファイルをダウンロードしました");
        },
        onError: (error) => {
            toast.error(error.message || "CSV出力に失敗しました");
        },
    });

    const exportVehiclesMutation = trpc.csv.exportVehicles.useMutation({
        onSuccess: (data) => {
            const bom = "\uFEFF";
            const csvContent = bom + data.csv;
            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `車両情報_${formatDateForInput(new Date())}.csv`;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("CSVファイルをダウンロードしました");
        },
        onError: (error) => {
            toast.error(error.message || "CSV出力に失敗しました");
        },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">CSV出力</h1>
                <p className="text-[hsl(var(--muted-foreground))] mt-2">
                    各種データをCSV形式でエクスポートします
                </p>
            </div>

            {/* 出退勤記録 */}
            <Card>
                <CardHeader>
                    <CardTitle>出退勤記録</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">開始日</label>
                            <Input
                                type="date"
                                value={attendanceStartDate}
                                onChange={(e) => setAttendanceStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">終了日</label>
                            <Input
                                type="date"
                                value={attendanceEndDate}
                                onChange={(e) => setAttendanceEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button
                        onClick={() =>
                            exportAttendanceMutation.mutate({
                                startDate: attendanceStartDate,
                                endDate: attendanceEndDate,
                            })
                        }
                        disabled={exportAttendanceMutation.isPending}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        ダウンロード
                    </Button>
                </CardContent>
            </Card>

            {/* 作業記録 */}
            <Card>
                <CardHeader>
                    <CardTitle>作業記録</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium">開始日</label>
                            <Input
                                type="date"
                                value={workRecordStartDate}
                                onChange={(e) => setWorkRecordStartDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium">終了日</label>
                            <Input
                                type="date"
                                value={workRecordEndDate}
                                onChange={(e) => setWorkRecordEndDate(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button
                        onClick={() =>
                            exportWorkRecordsMutation.mutate({
                                startDate: workRecordStartDate,
                                endDate: workRecordEndDate,
                            })
                        }
                        disabled={exportWorkRecordsMutation.isPending}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        ダウンロード
                    </Button>
                </CardContent>
            </Card>

            {/* 車両情報 */}
            <Card>
                <CardHeader>
                    <CardTitle>車両情報</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => exportVehiclesMutation.mutate()}
                        disabled={exportVehiclesMutation.isPending}
                    >
                        <Download className="h-4 w-4 mr-2" />
                        ダウンロード
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}

