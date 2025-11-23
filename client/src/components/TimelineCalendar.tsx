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

    return (
        <div className="w-full overflow-x-auto">
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
}

