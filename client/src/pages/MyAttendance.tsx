import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Clock } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function MyAttendance() {
    const { user } = useAuth();
    const { data: todayAttendance, refetch } = trpc.attendance.getTodayStatus.useQuery();

    const clockInMutation = trpc.attendance.clockIn.useMutation({
        onSuccess: () => {
            toast.success("出勤しました");
            refetch();
        },
        onError: (error) => {
            toast.error(error.message || "出勤に失敗しました");
        },
    });

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
            <div>
                <h1 className="text-3xl font-bold">出退勤記録</h1>
                <p className="text-[hsl(var(--muted-foreground))] mt-2">
                    {user?.name || user?.username}さんの出退勤状況
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>今日の出退勤</CardTitle>
                </CardHeader>
                <CardContent>
                    {todayAttendance ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">出勤時刻</p>
                                <p className="text-2xl font-semibold mt-1">
                                    {formatTime(todayAttendance.clockIn)}
                                </p>
                            </div>
                            {todayAttendance.clockOut ? (
                                <div>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">退勤時刻</p>
                                    <p className="text-2xl font-semibold mt-1">
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
                        <div className="text-center py-8">
                            <p className="text-[hsl(var(--muted-foreground))] mb-4">まだ出勤していません</p>
                            <Button onClick={() => clockInMutation.mutate({ deviceType: "pc" })}>
                                <Clock className="h-4 w-4 mr-2" />
                                出勤
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

