import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";

export default function MyAttendance() {
    const { user } = useAuth();
    const { data: todayAttendance } = trpc.attendance.getTodayStatus.useQuery();

    // 出勤打刻は管理者専用のため、一般ユーザーは使用不可

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return "0分";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
    };

    const formatAttendanceTime = (time: string | null | undefined) => {
        if (!time) return "--:--";
        return time;
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
                <CardHeader className="p-4 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">今日の出退勤</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6">
                    {todayAttendance ? (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-[hsl(var(--muted-foreground))]">出勤時刻</p>
                                <p className="text-2xl font-semibold mt-1">
                                    {formatAttendanceTime(todayAttendance.clockInTime)}
                                </p>
                            </div>
                            {todayAttendance.clockOutTime ? (
                                <div>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">退勤時刻</p>
                                    <p className="text-2xl font-semibold mt-1">
                                        {formatAttendanceTime(todayAttendance.clockOutTime)}
                                    </p>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))] mt-2">
                                        勤務時間: {formatDuration(todayAttendance.workMinutes)}
                                    </p>
                                </div>
                            ) : (
                                <p className="text-sm text-orange-500">作業中</p>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <p className="text-[hsl(var(--muted-foreground))] mb-4">まだ出勤していません</p>
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                出勤は管理者が「出退勤管理」ページで行います
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

