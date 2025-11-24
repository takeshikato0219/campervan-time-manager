import { createTRPCRouter, adminProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { eq, gte, lte, and } from "drizzle-orm";
import { startOfDay, endOfDay, format, addDays, eachDayOfInterval } from "date-fns";
import { z } from "zod";

// 20日始まりの1ヶ月期間を計算する関数
function getMonthPeriod20th(date: Date): { start: Date; end: Date } {
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    let startDate: Date;
    let endDate: Date;

    if (day >= 20) {
        // 20日以降の場合、今月20日から来月19日まで
        startDate = new Date(year, month, 20);
        endDate = new Date(year, month + 1, 19);
    } else {
        // 20日未満の場合、先月20日から今月19日まで
        startDate = new Date(year, month - 1, 20);
        endDate = new Date(year, month, 19);
    }

    return {
        start: startOfDay(startDate),
        end: endOfDay(endDate),
    };
}

export const csvRouter = createTRPCRouter({
    exportAttendance: adminProcedure
        .input(
            z.object({
                date: z.string().optional(), // 基準日（省略時は今日）
            })
        )
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new Error("データベースに接続できません");
            }

            // 基準日から20日始まりの1ヶ月期間を計算
            const baseDate = input.date ? new Date(input.date) : new Date();
            const { start, end } = getMonthPeriod20th(baseDate);

            // 期間内の全ユーザーを取得
            const users = await db.select().from(schema.users).orderBy(schema.users.id);
            const userMap = new Map(users.map((u) => [u.id, u]));

            // 期間内の出退勤記録を取得
            const records = await db
                .select()
                .from(schema.attendanceRecords)
                .where(
                    and(gte(schema.attendanceRecords.clockIn, start), lte(schema.attendanceRecords.clockIn, end))
                );

            // ユーザーIDと日付でマップを作成
            const recordsByUserAndDate = new Map<string, typeof records[0]>();
            records.forEach((record) => {
                const date = format(new Date(record.clockIn), "yyyy-MM-dd");
                const key = `${record.userId}_${date}`;
                recordsByUserAndDate.set(key, record);
            });

            // 期間内の全日付を生成
            const allDates = eachDayOfInterval({ start, end });

            const csvRows: string[][] = [];

            // 各ユーザーごとにセクションを作成
            users.forEach((user) => {
                const userName = user.name || user.username || "不明";
                
                // ユーザー名のヘッダー行
                csvRows.push([`${userName} (${user.id})`]);
                
                // カラムヘッダー
                csvRows.push(["日付", "出勤時刻", "退勤時刻", "勤務時間（分）", "出勤デバイス", "退勤デバイス"]);

                // 各日付のデータ
                allDates.forEach((date) => {
                    const dateStr = format(date, "yyyy-MM-dd");
                    const key = `${user.id}_${dateStr}`;
                    const record = recordsByUserAndDate.get(key);

                    if (record) {
                        const clockInDate = new Date(record.clockIn);
                        const clockOutDate = record.clockOut ? new Date(record.clockOut) : null;

                        csvRows.push([
                            dateStr,
                            clockInDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
                            clockOutDate
                                ? clockOutDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
                                : "",
                            record.workDuration?.toString() || "",
                            record.clockInDevice || "",
                            record.clockOutDevice || "",
                        ]);
                    } else {
                        // 出勤がない日は空欄
                        csvRows.push([dateStr, "", "", "", "", ""]);
                    }
                });

                // ユーザー間の区切り行（空行）
                csvRows.push([]);
            });

            // 期間情報を先頭に追加
            const periodInfo = [
                [`期間: ${format(start, "yyyy年MM月dd日")} ～ ${format(end, "yyyy年MM月dd日")}`],
                [],
            ];

            const csv = [...periodInfo, ...csvRows]
                .map((row) => {
                    if (row.length === 0) return "";
                    return row.map((cell) => `"${cell}"`).join(",");
                })
                .filter((row) => row !== "")
                .join("\n");

            return { csv };
        }),

    exportWorkRecords: adminProcedure
        .input(
            z.object({
                startDate: z.string(),
                endDate: z.string(),
            })
        )
        .mutation(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new Error("データベースに接続できません");
            }

            const start = startOfDay(new Date(input.startDate));
            const end = endOfDay(new Date(input.endDate));

            const records = await db
                .select()
                .from(schema.workRecords)
                .where(
                    and(gte(schema.workRecords.startTime, start), lte(schema.workRecords.startTime, end))
                );

            const users = await db.select().from(schema.users);
            const vehicles = await db.select().from(schema.vehicles);
            const processes = await db.select().from(schema.processes);
            const vehicleTypes = await db.select().from(schema.vehicleTypes);

            const userMap = new Map(users.map((u) => [u.id, u]));
            const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
            const processMap = new Map(processes.map((p) => [p.id, p]));
            const vehicleTypeMap = new Map(vehicleTypes.map((vt) => [vt.id, vt]));

            const csvRows = [
                ["ユーザー名", "車両番号", "車種", "工程", "開始時刻", "終了時刻", "作業時間（分）", "作業内容"],
            ];

            // ユーザーIDでグループ化して個人別にまとめる
            const recordsByUser = new Map<number, typeof records>();
            records.forEach((record) => {
                if (!recordsByUser.has(record.userId)) {
                    recordsByUser.set(record.userId, []);
                }
                recordsByUser.get(record.userId)!.push(record);
            });

            // ユーザーID順にソートして、各ユーザーの記録を日付順にソート
            const sortedUserIds = Array.from(recordsByUser.keys()).sort();
            sortedUserIds.forEach((userId) => {
                const userRecords = recordsByUser.get(userId)!;
                // 日付順にソート
                userRecords.sort((a, b) => {
                    const dateA = new Date(a.startTime).getTime();
                    const dateB = new Date(b.startTime).getTime();
                    return dateA - dateB;
                });

                userRecords.forEach((record) => {
                    const user = userMap.get(record.userId);
                    const vehicle = vehicleMap.get(record.vehicleId);
                    const process = processMap.get(record.processId);
                    const vehicleType = vehicle ? vehicleTypeMap.get(vehicle.vehicleTypeId) : null;

                    const startTime = new Date(record.startTime);
                    const endTime = record.endTime ? new Date(record.endTime) : null;
                    const durationMinutes = endTime
                        ? Math.floor((endTime.getTime() - startTime.getTime()) / 1000 / 60)
                        : null;

                    csvRows.push([
                        user?.name || user?.username || "不明",
                        vehicle?.vehicleNumber || "不明",
                        vehicleType?.name || "不明",
                        process?.name || "不明",
                        startTime.toISOString().replace("T", " ").substring(0, 16),
                        endTime ? endTime.toISOString().replace("T", " ").substring(0, 16) : "",
                        durationMinutes?.toString() || "",
                        record.workDescription || "",
                    ]);
                });
            });

            const csv = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

            return { csv };
        }),

    exportVehicles: adminProcedure.mutation(async () => {
        const db = await getDb();
        if (!db) {
            throw new Error("データベースに接続できません");
        }

        const vehicles = await db.select().from(schema.vehicles);
        const vehicleTypes = await db.select().from(schema.vehicleTypes);
        const vehicleTypeMap = new Map(vehicleTypes.map((vt) => [vt.id, vt]));

        const csvRows = [
            ["車両番号", "車種", "お客様名", "希望納期", "完成日", "ステータス", "目標合計時間（分）"],
        ];

        vehicles.forEach((vehicle) => {
            const vehicleType = vehicleTypeMap.get(vehicle.vehicleTypeId);
            csvRows.push([
                vehicle.vehicleNumber,
                vehicleType?.name || "不明",
                vehicle.customerName || "",
                vehicle.desiredDeliveryDate
                    ? new Date(vehicle.desiredDeliveryDate).toISOString().split("T")[0]
                    : "",
                vehicle.completionDate
                    ? new Date(vehicle.completionDate).toISOString().split("T")[0]
                    : "",
                vehicle.status,
                vehicle.targetTotalMinutes?.toString() || "",
            ]);
        });

        const csv = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

        return { csv };
    }),
});

