import React from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../components/ui/table";

export default function Analytics() {
    const { data: vehicleTypeStats } = trpc.analytics.getVehicleTypeStats.useQuery();
    const { data: processStats } = trpc.analytics.getProcessStats.useQuery();
    const { data: vehicleTypeProcessStats } = trpc.analytics.getVehicleTypeProcessStats.useQuery();

    const formatDuration = (minutes: number) => {
        if (!minutes) return "0分";
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}時間${mins}分` : `${mins}分`;
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">統計・分析</h1>
                <p className="text-[hsl(var(--muted-foreground))] mt-2">
                    車種別・工程別の作業時間を集計します
                </p>
            </div>

            {/* 車種別統計 */}
            <Card>
                <CardHeader>
                    <CardTitle>車種別統計</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>車種</TableHead>
                                <TableHead>車両数</TableHead>
                                <TableHead>合計作業時間</TableHead>
                                <TableHead>平均作業時間</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicleTypeStats && vehicleTypeStats.length > 0 ? (
                                vehicleTypeStats.map((stat) => (
                                    <TableRow key={stat.vehicleTypeId}>
                                        <TableCell>{stat.vehicleTypeName}</TableCell>
                                        <TableCell>{stat.vehicleCount}台</TableCell>
                                        <TableCell>{formatDuration(stat.totalMinutes)}</TableCell>
                                        <TableCell>{formatDuration(stat.averageMinutes)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-[hsl(var(--muted-foreground))]">
                                        データがありません
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* 工程別統計 */}
            <Card>
                <CardHeader>
                    <CardTitle>工程別統計</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>工程</TableHead>
                                <TableHead>作業回数</TableHead>
                                <TableHead>合計作業時間</TableHead>
                                <TableHead>平均作業時間</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processStats && processStats.length > 0 ? (
                                processStats.map((stat) => (
                                    <TableRow key={stat.processId}>
                                        <TableCell>{stat.processName}</TableCell>
                                        <TableCell>{stat.workCount}回</TableCell>
                                        <TableCell>{formatDuration(stat.totalMinutes)}</TableCell>
                                        <TableCell>{formatDuration(stat.averageMinutes)}</TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center text-[hsl(var(--muted-foreground))]">
                                        データがありません
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* 車種別・工程別統計 */}
            <Card>
                <CardHeader>
                    <CardTitle>車種別・工程別統計</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>車種</TableHead>
                                <TableHead>工程</TableHead>
                                <TableHead>作業回数</TableHead>
                                <TableHead>平均作業時間</TableHead>
                                <TableHead>標準時間</TableHead>
                                <TableHead>差異</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {vehicleTypeProcessStats && vehicleTypeProcessStats.length > 0 ? (
                                vehicleTypeProcessStats.map((stat) => {
                                    const difference = stat.averageMinutes - (stat.standardMinutes || 0);
                                    const differencePercent = stat.standardMinutes
                                        ? ((difference / stat.standardMinutes) * 100).toFixed(1)
                                        : "-";

                                    return (
                                        <TableRow key={`${stat.vehicleTypeId}-${stat.processId}`}>
                                            <TableCell>{stat.vehicleTypeName}</TableCell>
                                            <TableCell>{stat.processName}</TableCell>
                                            <TableCell>{stat.workCount}回</TableCell>
                                            <TableCell>{formatDuration(stat.averageMinutes)}</TableCell>
                                            <TableCell>
                                                {stat.standardMinutes ? formatDuration(stat.standardMinutes) : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {stat.standardMinutes ? (
                                                    <span
                                                        className={
                                                            difference > 0 ? "text-red-500" : "text-green-500"
                                                        }
                                                    >
                                                        {difference > 0 ? "+" : ""}
                                                        {formatDuration(Math.abs(difference))} ({differencePercent}%)
                                                    </span>
                                                ) : (
                                                    "-"
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-[hsl(var(--muted-foreground))]">
                                        データがありません
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

