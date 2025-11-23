import { createTRPCRouter, adminProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { eq, gte, lte, and } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";
import { z } from "zod";

export const csvRouter = createTRPCRouter({
    exportAttendance: adminProcedure
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
                .from(schema.attendanceRecords)
                .where(
                    and(gte(schema.attendanceRecords.clockIn, start), lte(schema.attendanceRecords.clockIn, end))
                );

            const users = await db.select().from(schema.users);
            const userMap = new Map(users.map((u) => [u.id, u]));

            const csvRows = [
                ["ユーザー名", "出勤日", "出勤時刻", "退勤時刻", "勤務時間（分）", "出勤デバイス", "退勤デバイス"],
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
                    const dateA = new Date(a.clockIn).getTime();
                    const dateB = new Date(b.clockIn).getTime();
                    return dateA - dateB;
                });

                userRecords.forEach((record) => {
                    const user = userMap.get(record.userId);
                    const userName = user?.name || user?.username || "不明";
                    const clockInDate = new Date(record.clockIn);
                    const clockOutDate = record.clockOut ? new Date(record.clockOut) : null;

                    csvRows.push([
                        userName,
                        clockInDate.toISOString().split("T")[0],
                        clockInDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
                        clockOutDate
                            ? clockOutDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })
                            : "",
                        record.workDuration?.toString() || "",
                        record.clockInDevice || "",
                        record.clockOutDevice || "",
                    ]);
                });
            });

            const csv = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");

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

