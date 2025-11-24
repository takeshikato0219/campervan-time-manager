import React from "react";
import { format } from "date-fns";

interface WorkRecord {
    id: number;
    startTime: string; // ISO 8601形式
    endTime: string | null; // ISO 8601形式、nullは作業中
    vehicleNumber: string;
    processName: string;
    durationMinutes: number | null;
}

interface TimelineCalendarProps {
    workRecords: WorkRecord[];
    date: Date;
}

const START_HOUR = 6; // 6:00
const END_HOUR = 23; // 23:00
const TOTAL_HOURS = END_HOUR - START_HOUR; // 17時間

export default function TimelineCalendar({ workRecords, date }: TimelineCalendarProps) {
    const getMinutesFromStart = (time: Date) => {
        const hours = time.getHours();
        const minutes = time.getMinutes();
        return (hours - START_HOUR) * 60 + minutes;
    };

    const formatDuration = (minutes: number | null) => {
        if (!minutes) return "0分";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
    };

    const formatTime = (time: Date) => {
        return format(time, "HH:mm");
    };

    // スマホ用の縦表示
    const VerticalView = () => (
        <div className="space-y-3 sm:hidden">
            {workRecords.length === 0 ? (
                <p className="text-center text-sm text-[hsl(var(--muted-foreground))] py-4">
                    作業記録がありません
                </p>
            ) : (
                workRecords.map((record) => {
                    const startDate = new Date(record.startTime);
                    const endDate = record.endTime ? new Date(record.endTime) : new Date();

                    return (
                        <div
                            key={record.id}
                            className={`p-3 rounded-lg border ${record.endTime ? "bg-blue-50 border-blue-200" : "bg-green-50 border-green-200 animate-pulse"
                                }`}
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm truncate">
                                        {record.vehicleNumber}
                                    </p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                                        {record.processName}
                                    </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <p className="text-xs font-medium">
                                        {formatTime(startDate)}
                                        {record.endTime ? ` - ${formatTime(endDate)}` : " (作業中)"}
                                    </p>
                                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                                        {formatDuration(record.durationMinutes)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
    );

    // PC用の横表示
    const HorizontalView = () => (
        <div className="w-full overflow-x-auto hidden sm:block">
            <div className="min-w-[800px]">
                {/* 時間軸 */}
                <div className="flex border-b border-[hsl(var(--border))] mb-2">
                    {Array.from({ length: TOTAL_HOURS }, (_, i) => START_HOUR + i).map((hour) => (
                        <div key={hour} className="flex-1 text-center text-xs text-[hsl(var(--muted-foreground))]">
                            {hour}:00
                        </div>
                    ))}
                </div>

                {/* タイムライン */}
                <div className="relative h-32 bg-[hsl(var(--muted))] rounded-lg">
                    {workRecords.map((record) => {
                        const startDate = new Date(record.startTime);
                        const endDate = record.endTime ? new Date(record.endTime) : new Date();

                        const startMinutes = getMinutesFromStart(startDate);
                        const endMinutes = getMinutesFromStart(endDate);
                        const duration = endMinutes - startMinutes;

                        const left = (startMinutes / (TOTAL_HOURS * 60)) * 100;
                        const width = (duration / (TOTAL_HOURS * 60)) * 100;

                        return (
                            <div
                                key={record.id}
                                className={`absolute h-8 rounded-lg flex items-center px-2 text-xs text-white overflow-hidden ${record.endTime ? "bg-blue-500" : "bg-green-500 animate-pulse"
                                    }`}
                                style={{
                                    left: `${left}%`,
                                    width: `${width}%`,
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                }}
                                title={`${record.vehicleNumber} - ${record.processName} (${formatDuration(record.durationMinutes)})`}
                            >
                                <span className="truncate">
                                    {record.vehicleNumber} - {record.processName}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full">
            <VerticalView />
            <HorizontalView />
        </div>
    );
}

