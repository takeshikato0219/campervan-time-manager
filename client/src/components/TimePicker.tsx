import React from "react";

type TimePickerProps = {
    value: string;
    onChange: (value: string) => void;
    className?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

export function TimePicker({ value, onChange, className }: TimePickerProps) {
    const [hourPart, minutePart] = (value || "").split(":");
    const hour = HOURS.includes(hourPart || "") ? hourPart! : "08";
    const minute = MINUTES.includes(minutePart || "") ? minutePart! : "00";

    const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const h = e.target.value;
        onChange(`${h}:${minute}`);
    };

    const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const m = e.target.value;
        onChange(`${hour}:${m}`);
    };

    return (
        <div className={`flex items-center gap-1 ${className || ""}`}>
            <select
                className="h-9 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-1 text-xs sm:text-sm"
                value={hour}
                onChange={handleHourChange}
            >
                {HOURS.map((h) => (
                    <option key={h} value={h}>
                        {h}
                    </option>
                ))}
            </select>
            <span className="text-xs sm:text-sm">:</span>
            <select
                className="h-9 rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-1 text-xs sm:text-sm"
                value={minute}
                onChange={handleMinuteChange}
            >
                {MINUTES.map((m) => (
                    <option key={m} value={m}>
                        {m}
                    </option>
                ))}
            </select>
        </div>
    );
}


