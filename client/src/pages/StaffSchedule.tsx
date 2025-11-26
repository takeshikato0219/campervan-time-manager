import React, { useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { format, parse } from "date-fns";
import { ja } from "date-fns/locale";

type ScheduleStatus = "work" | "rest" | "request" | "exhibition" | "other" | "morning" | "afternoon";

const STATUS_COLORS: Record<ScheduleStatus, string> = {
    work: "bg-blue-100", // 水色 = 出勤
    rest: "bg-pink-200", // ピンク = 休み
    request: "bg-pink-300", // ピンク = 希望休
    exhibition: "bg-green-100", // 薄緑 = 展示会
    other: "bg-green-50", // 薄緑 = その他業務
    morning: "bg-yellow-100", // 黄色 = 午前出
    afternoon: "bg-orange-100", // オレンジ = 午後出
};

const STATUS_LABELS: Record<ScheduleStatus, string> = {
    work: "出勤",
    rest: "休",
    request: "希望",
    exhibition: "展",
    other: "その他",
    morning: "午前出",
    afternoon: "午後出",
};

export default function StaffSchedule() {
    const { user } = useAuth();
    const [baseDate, setBaseDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
    // フィルタは一旦「全員表示」のみ（スタッフは独立管理のため）

    const { data: scheduleData, isLoading, error, isError } = trpc.staffSchedule.getPublishedSchedule.useQuery(
        { baseDate },
        {
            retry: false,
            onError: (err) => {
                console.error("[StaffSchedule] エラー:", err);
            },
        }
    );

    if (isLoading) {
        return (
            <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))] mx-auto"></div>
                <p className="mt-4">読み込み中...</p>
            </div>
        );
    }

    if (isError || error) {
        const errorMessage = error?.message || "不明なエラー";
        return (
            <div className="text-center py-8 space-y-4">
                <div className="text-red-500">
                    <p className="font-bold text-lg">エラーが発生しました</p>
                    <p className="mt-2">{errorMessage}</p>
                </div>
                <div className="text-sm text-[hsl(var(--muted-foreground))] space-y-2">
                    <p>考えられる原因：</p>
                    <ul className="list-disc list-inside space-y-1">
                        <li>データベースのテーブルが作成されていない</li>
                        <li>データベース接続エラー</li>
                        <li>サーバーエラー</li>
                    </ul>
                    <p className="mt-4">解決方法：</p>
                    <p className="font-mono bg-[hsl(var(--muted))] p-2 rounded mt-2">pnpm db:push</p>
                    <p className="text-xs mt-2">を実行してマイグレーションを実行してください</p>
                </div>
                <details className="mt-4 text-left max-w-2xl mx-auto">
                    <summary className="cursor-pointer text-sm text-[hsl(var(--muted-foreground))]">
                        エラー詳細を表示
                    </summary>
                    <pre className="mt-2 p-4 bg-[hsl(var(--muted))] rounded text-xs overflow-auto">
                        {JSON.stringify(error, null, 2)}
                    </pre>
                </details>
            </div>
        );
    }

    if (!scheduleData) {
        return <div className="text-center py-8">データがありません</div>;
    }

    // フィルタリングされたユーザーリスト（現状は全員）
    const filteredUsers = scheduleData.users;

    // フィルタリングされたスケジュールデータ
    const filteredScheduleData = scheduleData.scheduleData.map((day) => ({
        ...day,
        userEntries: day.userEntries.filter((entry) =>
            filteredUsers.some((u) => u.id === entry.userId)
        ),
    }));

    // フィルタリングされた集計データ
    const filteredSummary = scheduleData.summary.filter((s) =>
        filteredUsers.some((u) => u.id === s.userId)
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">スタッフ休み予定一覧</h1>
                    <p className="text-[hsl(var(--muted-foreground))] mt-2">
                        期間: {format(parse(scheduleData.period.start, "yyyy-MM-dd", new Date()), "yyyy年MM月dd日")} ～{" "}
                        {format(parse(scheduleData.period.end, "yyyy-MM-dd", new Date()), "yyyy年MM月dd日")}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Input type="date" value={baseDate} onChange={(e) => setBaseDate(e.target.value)} className="max-w-xs" />
                </div>
            </div>

            {/* 凡例 */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.work}`}></div>
                            <span>出勤</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.rest}`}></div>
                            <span>休み</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.request}`}></div>
                            <span>希望休</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.exhibition}`}></div>
                            <span>展示会</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.other}`}></div>
                            <span>その他業務</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.morning}`}></div>
                            <span>午前出</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded ${STATUS_COLORS.afternoon}`}></div>
                            <span>午後出</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* スケジュール表 */}
            <div className="overflow-x-auto">
                <div className="w-full max-w-full">
                    <table className="w-full border-collapse border border-[hsl(var(--border))] text-xs">
                        <thead>
                            <tr>
                                <th className="border border-[hsl(var(--border))] p-1 sm:p-2 bg-[hsl(var(--muted))] sticky left-0 z-10 min-w-[70px]">
                                    日付
                                </th>
                                {filteredUsers.map((u) => (
                                    <th
                                        key={u.id}
                                        className="border border-[hsl(var(--border))] p-1 sm:p-2 bg-[hsl(var(--muted))] min-w-[60px] sm:min-w-[80px]"
                                    >
                                        <span className="text-[10px] sm:text-xs">{u.name}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredScheduleData.map((day) => (
                                <tr key={day.date}>
                                    <td
                                        className={`border border-[hsl(var(--border))] p-1 sm:p-2 text-[10px] sm:text-xs sticky left-0 z-10 ${day.isWeekend ? "bg-pink-100" : "bg-white"
                                            }`}
                                    >
                                        <div>{format(day.dateObj, "MM/dd", { locale: ja })}</div>
                                        <div className="text-[9px] sm:text-[10px] text-[hsl(var(--muted-foreground))]">
                                            {format(day.dateObj, "E", { locale: ja })}
                                        </div>
                                    </td>
                                    {day.userEntries.map((entry) => (
                                        <td
                                            key={entry.userId}
                                            className={`border border-[hsl(var(--border))] p-0.5 sm:p-1 text-center ${STATUS_COLORS[entry.status as ScheduleStatus]
                                                }`}
                                        >
                                            <div className="text-[10px] sm:text-xs font-medium">
                                                {STATUS_LABELS[entry.status as ScheduleStatus]}
                                            </div>
                                            {entry.comment && (
                                                <div className="text-[8px] sm:text-[9px] text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
                                                    {entry.comment}
                                                </div>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                        {/* 集計行 */}
                        <tfoot>
                            <tr className="bg-yellow-50">
                                <td className="border border-[hsl(var(--border))] p-1 sm:p-2 text-[10px] sm:text-xs font-medium sticky left-0 z-10">
                                    休みの数
                                </td>
                                {filteredSummary.map((s) => (
                                    <td key={s.userId} className="border border-[hsl(var(--border))] p-1 sm:p-2 text-[10px] sm:text-xs text-center">
                                        {s.restDays || 0}
                                    </td>
                                ))}
                            </tr>
                            <tr className="bg-gray-50">
                                <td className="border border-[hsl(var(--border))] p-1 sm:p-2 text-[10px] sm:text-xs font-medium sticky left-0 z-10">
                                    勤務日数
                                </td>
                                {filteredSummary.map((s) => (
                                    <td key={s.userId} className="border border-[hsl(var(--border))] p-1 sm:p-2 text-[10px] sm:text-xs text-center">
                                        {typeof s.workDays === 'number' && s.workDays % 1 !== 0
                                            ? s.workDays.toFixed(1)
                                            : s.workDays}
                                    </td>
                                ))}
                            </tr>
                            <tr className="bg-gray-50">
                                <td className="border border-[hsl(var(--border))] p-1 sm:p-2 text-[10px] sm:text-xs font-medium sticky left-0 z-10">
                                    公休
                                </td>
                                {filteredSummary.map((s) => (
                                    <td key={s.userId} className="border border-[hsl(var(--border))] p-1 sm:p-2 text-[10px] sm:text-xs text-center">
                                        {s.publicHolidays}
                                    </td>
                                ))}
                            </tr>
                            <tr className="bg-gray-50">
                                <td className="border border-[hsl(var(--border))] p-1 sm:p-2 text-[10px] sm:text-xs font-medium sticky left-0 z-10">
                                    有休
                                </td>
                                {filteredSummary.map((s) => (
                                    <td key={s.userId} className="border border-[hsl(var(--border))] p-1 sm:p-2 text-[10px] sm:text-xs text-center">
                                        {s.paidLeave}
                                    </td>
                                ))}
                            </tr>
                            <tr className="bg-gray-50">
                                <td className="border border-[hsl(var(--border))] p-1 sm:p-2 text-[10px] sm:text-xs font-medium sticky left-0 z-10">
                                    合計
                                </td>
                                {filteredSummary.map((s) => (
                                    <td key={s.userId} className="border border-[hsl(var(--border))] p-1 sm:p-2 text-[10px] sm:text-xs text-center">
                                        {s.totalRest}
                                    </td>
                                ))}
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}

