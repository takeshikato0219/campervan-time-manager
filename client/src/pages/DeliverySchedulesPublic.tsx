import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { format } from "date-fns";

export default function DeliverySchedulesPublic() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);

    const { data, isLoading } = trpc.deliverySchedules.publicList.useQuery({ year, month });

    const handlePrevMonth = () => {
        if (month === 1) {
            setYear((y) => y - 1);
            setMonth(12);
        } else {
            setMonth((m) => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (month === 12) {
            setYear((y) => y + 1);
            setMonth(1);
        } else {
            setMonth((m) => m + 1);
        }
    };

    return (
        <div className="min-h-screen bg-[hsl(var(--background))] flex items-start justify-center py-4 px-2 sm:px-4">
            <div className="w-full max-w-3xl">
                <header className="mb-3 sm:mb-4 flex flex-col gap-2">
                    <h1 className="text-xl sm:text-2xl font-bold text-center">
                        ワングラム様製造スケジュール（外部公開）
                    </h1>
                    <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] text-center">
                        このページは社外から閲覧できる製造・納車スケジュールです。スマホ・PC両対応です。
                    </p>
                </header>

                <div className="flex items-center justify-center gap-2 mb-3">
                    <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-[7rem] text-center font-semibold">
                        {year}年{month}月
                    </span>
                    <Button variant="outline" size="icon" onClick={handleNextMonth}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <Card>
                    <CardHeader className="p-3 sm:p-4">
                        <CardTitle className="text-base sm:text-lg">
                            今月のワングラム様製造スケジュール
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
                        {isLoading ? (
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">読み込み中...</p>
                        ) : !data || data.length === 0 ? (
                            <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                この月の納車スケジュールはありません
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {data.map((item: any) => (
                                    <div
                                        key={item.id}
                                        className="border border-[hsl(var(--border))] rounded-lg p-2 sm:p-3 flex flex-col gap-1.5"
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-sm sm:text-base break-words">
                                                    {item.vehicleName}
                                                </p>
                                                <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] break-words">
                                                    {item.vehicleType || "車種未設定"} ／{" "}
                                                    {item.customerName || "お客様名未設定"}
                                                </p>
                                                {item.optionName && (
                                                    <p className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] break-words">
                                                        オプション: {item.optionName}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                {item.deliveryPlannedDate && (
                                                    <span className="text-[11px] sm:text-xs font-semibold">
                                                        katomotor完成予定:{" "}
                                                        {format(new Date(item.deliveryPlannedDate), "M月d日")}
                                                    </span>
                                                )}
                                                {item.dueDate && (
                                                    <span className="text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))]">
                                                        ワングラム入庫予定:{" "}
                                                        {format(new Date(item.dueDate), "M月d日")}
                                                    </span>
                                                )}
                                                {item.delayDays > 0 && (
                                                    <span className="mt-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-[10px] sm:text-xs">
                                                        {item.delayDays}日遅れ
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {(item.comment || item.claimComment || item.oemComment) && (
                                            <div className="mt-1 text-[11px] sm:text-xs text-[hsl(var(--muted-foreground))] space-y-0.5">
                                                {item.comment && <p>メモ: {item.comment}</p>}
                                                {item.claimComment && <p>クレーム・傷: {item.claimComment}</p>}
                                                {item.oemComment && <p>ワングラム側メモ: {item.oemComment}</p>}
                                            </div>
                                        )}
                                        {item.specSheetUrl && (
                                            <a
                                                href={item.specSheetUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1 inline-flex items-center gap-1 text-[10px] sm:text-xs text-blue-600 hover:text-blue-800 underline"
                                            >
                                                <FileText className="h-3 w-3" />
                                                製造注意仕様書を表示
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


