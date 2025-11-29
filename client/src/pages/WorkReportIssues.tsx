import { useLocation, Link } from "wouter";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { ArrowLeft, Clock, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

export default function WorkReportIssues() {
    const [location, setLocation] = useLocation();
    const params = new URLSearchParams(location.split("?")[1] || "");
    const userId = params.get("userId") ? parseInt(params.get("userId")!) : null;
    const workDate = params.get("workDate") || "";
    const issueType = params.get("type") || ""; // "excessive" or "low"

    const { data: detail, isLoading, error } = trpc.analytics.getWorkReportDetail.useQuery(
        {
            userId: userId!,
            workDate,
        },
        {
            enabled: !!userId && !!workDate,
        }
    );

    const formatDuration = (minutes: number) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
    };

    const formatTime = (time: string | null | undefined) => {
        if (!time) return "--:--";
        return time;
    };

    if (!userId || !workDate) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            戻る
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">作業報告の詳細</h1>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-[hsl(var(--muted-foreground))]">
                            パラメータが正しくありません。
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            戻る
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">作業報告の詳細</h1>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-[hsl(var(--muted-foreground))]">読み込み中...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !detail) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/">
                        <Button variant="outline" size="sm">
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            戻る
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">作業報告の詳細</h1>
                </div>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-red-600">エラーが発生しました: {error?.message || "データが見つかりません"}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const dateObj = new Date(detail.workDate);
    const dateStr = format(dateObj, "yyyy年MM月dd日(E)", { locale: ja });

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        戻る
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">作業報告の詳細</h1>
                    <p className="text-[hsl(var(--muted-foreground))] mt-1 text-sm">
                        {detail.userName}さん - {dateStr}
                    </p>
                </div>
            </div>

            {/* 警告表示 */}
            {issueType === "excessive" && detail.summary.differenceMinutes > 30 && (
                <Card className="border-red-300 bg-red-50">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-red-900 text-sm sm:text-base">
                                    作業報告が出勤時間を超えています
                                </p>
                                <p className="text-xs sm:text-sm text-red-800 mt-1">
                                    作業時間が{formatDuration(detail.summary.differenceMinutes)}超過しています
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {issueType === "low" && detail.summary.workMinutes < (detail.summary.attendanceMinutes - 90) && (
                <Card className="border-yellow-300 bg-yellow-50">
                    <CardContent className="p-4 sm:p-6">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="font-semibold text-yellow-900 text-sm sm:text-base">
                                    作業報告が不足しています
                                </p>
                                <p className="text-xs sm:text-sm text-yellow-800 mt-1">
                                    期待される作業時間より{formatDuration((detail.summary.attendanceMinutes - 90) - detail.summary.workMinutes)}不足しています
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* 出勤情報 */}
            {detail.attendance ? (
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                            <Clock className="h-5 w-5" />
                            出勤情報
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-3">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">出勤時刻</p>
                                <p className="text-lg font-semibold">{formatTime(detail.attendance.clockInTime)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">退勤時刻</p>
                                <p className="text-lg font-semibold">{formatTime(detail.attendance.clockOutTime)}</p>
                            </div>
                        </div>
                        <div className="pt-3 border-t border-[hsl(var(--border))]">
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">出勤時間</p>
                            <p className="text-2xl font-bold text-blue-600">
                                {formatDuration(detail.summary.attendanceMinutes)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader className="p-4 sm:p-6">
                        <CardTitle className="text-lg sm:text-xl">出勤情報</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6">
                        <p className="text-[hsl(var(--muted-foreground))]">出勤記録が見つかりません</p>
                    </CardContent>
                </Card>
            )}

            {/* 作業記録 */}
            <Card>
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">作業記録</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    {detail.workRecords && detail.workRecords.length > 0 ? (
                        <div className="space-y-3">
                            {detail.workRecords.map((record) => {
                                const startTime = typeof record.startTime === "string"
                                    ? new Date(record.startTime)
                                    : record.startTime;
                                const endTime = record.endTime
                                    ? typeof record.endTime === "string"
                                        ? new Date(record.endTime)
                                        : record.endTime
                                    : null;

                                return (
                                    <div
                                        key={record.id}
                                        className="p-3 sm:p-4 border border-[hsl(var(--border))] rounded-lg bg-gray-50"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-semibold text-sm sm:text-base">
                                                    {record.vehicleNumber}
                                                    {record.customerName && (
                                                        <span className="text-xs text-[hsl(var(--muted-foreground))] ml-2">
                                                            ({record.customerName})
                                                        </span>
                                                    )}
                                                </p>
                                                <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-1">
                                                    {record.processName}
                                                </p>
                                            </div>
                                            <div className="text-right flex-shrink-0">
                                                <p className="font-semibold text-sm sm:text-base">
                                                    {formatDuration(record.durationMinutes)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-xs text-[hsl(var(--muted-foreground))]">
                                            {format(startTime, "HH:mm")}
                                            {endTime ? ` - ${format(endTime, "HH:mm")}` : " (作業中)"}
                                        </div>
                                        {record.workDescription && (
                                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                                {record.workDescription}
                                            </p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="text-[hsl(var(--muted-foreground))] text-center py-4">
                            作業記録がありません
                        </p>
                    )}

                    {/* 作業時間の合計 */}
                    <div className="mt-6 pt-6 border-t border-[hsl(var(--border))]">
                        <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold">作業時間の合計</p>
                            <p className="text-2xl font-bold text-green-600">
                                {formatDuration(detail.summary.workMinutes)}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 比較サマリー */}
            <Card>
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">比較サマリー</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">出勤時間</p>
                            <p className="text-xl font-bold text-blue-600">
                                {formatDuration(detail.summary.attendanceMinutes)}
                            </p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">作業時間</p>
                            <p className="text-xl font-bold text-green-600">
                                {formatDuration(detail.summary.workMinutes)}
                            </p>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-[hsl(var(--border))]">
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-1">差</p>
                        <p
                            className={`text-2xl font-bold ${
                                detail.summary.differenceMinutes > 30
                                    ? "text-red-600"
                                    : detail.summary.differenceMinutes > 0
                                    ? "text-orange-600"
                                    : detail.summary.differenceMinutes < 0
                                    ? "text-yellow-600"
                                    : "text-gray-600"
                            }`}
                        >
                            {detail.summary.differenceMinutes > 0 ? "+" : ""}
                            {formatDuration(detail.summary.differenceMinutes)}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

