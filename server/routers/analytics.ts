import { createTRPCRouter, protectedProcedure } from "../_core/trpc";
import { getDb, schema } from "../db";
import { eq, sql } from "drizzle-orm";

export const analyticsRouter = createTRPCRouter({
    getVehicleTypeStats: protectedProcedure.query(async () => {
        const db = await getDb();
        if (!db) {
            return [];
        }

        const stats = await db
            .select({
                vehicleTypeId: schema.vehicles.vehicleTypeId,
                vehicleCount: sql<number>`COUNT(DISTINCT ${schema.vehicles.id})`.as("vehicleCount"),
                totalMinutes: sql<number>`COALESCE(SUM(TIMESTAMPDIFF(MINUTE, ${schema.workRecords.startTime}, ${schema.workRecords.endTime})), 0)`.as("totalMinutes"),
            })
            .from(schema.vehicles)
            .leftJoin(schema.workRecords, eq(schema.vehicles.id, schema.workRecords.vehicleId))
            .where(sql`${schema.workRecords.endTime} IS NOT NULL`)
            .groupBy(schema.vehicles.vehicleTypeId);

        // 車種名を取得
        const vehicleTypes = await db.select().from(schema.vehicleTypes);
        const vehicleTypeMap = new Map(vehicleTypes.map((vt) => [vt.id, vt.name]));

        return stats.map((stat) => {
            const vehicleCount = Number(stat.vehicleCount) || 0;
            const totalMinutes = Number(stat.totalMinutes) || 0;
            const averageMinutes = vehicleCount > 0 ? Math.round(totalMinutes / vehicleCount) : 0;

            return {
                vehicleTypeId: stat.vehicleTypeId,
                vehicleTypeName: vehicleTypeMap.get(stat.vehicleTypeId) || "不明",
                vehicleCount,
                totalMinutes,
                averageMinutes,
            };
        });
    }),

    getProcessStats: protectedProcedure.query(async () => {
        const db = await getDb();
        if (!db) {
            return [];
        }

        const stats = await db
            .select({
                processId: schema.workRecords.processId,
                workCount: sql<number>`COUNT(*)`.as("workCount"),
                totalMinutes: sql<number>`COALESCE(SUM(TIMESTAMPDIFF(MINUTE, ${schema.workRecords.startTime}, ${schema.workRecords.endTime})), 0)`.as("totalMinutes"),
            })
            .from(schema.workRecords)
            .where(sql`${schema.workRecords.endTime} IS NOT NULL`)
            .groupBy(schema.workRecords.processId);

        // 工程名を取得
        const processes = await db.select().from(schema.processes);
        const processMap = new Map(processes.map((p) => [p.id, p.name]));

        return stats.map((stat) => {
            const workCount = Number(stat.workCount) || 0;
            const totalMinutes = Number(stat.totalMinutes) || 0;
            const averageMinutes = workCount > 0 ? Math.round(totalMinutes / workCount) : 0;

            return {
                processId: stat.processId,
                processName: processMap.get(stat.processId) || "不明",
                workCount,
                totalMinutes,
                averageMinutes,
            };
        });
    }),

    getVehicleTypeProcessStats: protectedProcedure.query(async () => {
        const db = await getDb();
        if (!db) {
            return [];
        }

        const stats = await db
            .select({
                vehicleTypeId: schema.vehicles.vehicleTypeId,
                processId: schema.workRecords.processId,
                workCount: sql<number>`COUNT(*)`.as("workCount"),
                totalMinutes: sql<number>`COALESCE(SUM(TIMESTAMPDIFF(MINUTE, ${schema.workRecords.startTime}, ${schema.workRecords.endTime})), 0)`.as("totalMinutes"),
            })
            .from(schema.workRecords)
            .innerJoin(schema.vehicles, eq(schema.workRecords.vehicleId, schema.vehicles.id))
            .where(sql`${schema.workRecords.endTime} IS NOT NULL`)
            .groupBy(schema.vehicles.vehicleTypeId, schema.workRecords.processId);

        // 車種名と工程名を取得
        const vehicleTypes = await db.select().from(schema.vehicleTypes);
        const processes = await db.select().from(schema.processes);
        const vehicleTypeMap = new Map(vehicleTypes.map((vt) => [vt.id, vt.name]));
        const processMap = new Map(processes.map((p) => [p.id, p.name]));

        // 標準時間を取得
        const standards = await db.select().from(schema.vehicleTypeProcessStandards);
        const standardMap = new Map(
            standards.map((s) => [`${s.vehicleTypeId}-${s.processId}`, s.standardMinutes])
        );

        return stats.map((stat) => {
            const workCount = Number(stat.workCount) || 0;
            const totalMinutes = Number(stat.totalMinutes) || 0;
            const averageMinutes = workCount > 0 ? Math.round(totalMinutes / workCount) : 0;
            const standardMinutes =
                standardMap.get(`${stat.vehicleTypeId}-${stat.processId}`) || null;

            return {
                vehicleTypeId: stat.vehicleTypeId,
                vehicleTypeName: vehicleTypeMap.get(stat.vehicleTypeId) || "不明",
                processId: stat.processId,
                processName: processMap.get(stat.processId) || "不明",
                workCount,
                totalMinutes,
                averageMinutes,
                standardMinutes,
            };
        });
    }),

    /**
     * 車両ごとの制作時間を集計する
     * - 1台あたりの総作業時間（全期間）
     * - 工程ごとの総作業時間
     * - 工程をクリックしたときに表示する「誰が・いつ・何分」単位の明細
     */
    getVehicleProductionTimes: protectedProcedure.query(async () => {
        const db = await getDb();
        if (!db) {
            return [];
        }

        const rows = await db
            .select({
                vehicleId: schema.workRecords.vehicleId,
                vehicleNumber: schema.vehicles.vehicleNumber,
                customerName: schema.vehicles.customerName,
                desiredDeliveryDate: schema.vehicles.desiredDeliveryDate,
                completionDate: schema.vehicles.completionDate,
                processId: schema.workRecords.processId,
                processName: schema.processes.name,
                userId: schema.workRecords.userId,
                userName: schema.users.name,
                userUsername: schema.users.username,
                workDate: sql<string>`DATE(${schema.workRecords.startTime})`.as("workDate"),
                // 進行中の作業も含めて「今までにかかった時間」を見る
                minutes: sql<number>`COALESCE(TIMESTAMPDIFF(MINUTE, ${schema.workRecords.startTime}, COALESCE(${schema.workRecords.endTime}, NOW())), 0)`.as(
                    "minutes",
                ),
            })
            .from(schema.workRecords)
            .innerJoin(schema.vehicles, eq(schema.workRecords.vehicleId, schema.vehicles.id))
            .innerJoin(schema.processes, eq(schema.workRecords.processId, schema.processes.id))
            .innerJoin(schema.users, eq(schema.workRecords.userId, schema.users.id));

        type VehicleAgg = {
            vehicleId: number;
            vehicleNumber: string;
            customerName: string | null;
            totalMinutes: number;
            desiredDeliveryDate: Date | null;
            completionDate: Date | null;
            processes: {
                processId: number;
                processName: string;
                totalMinutes: number;
                details: {
                    userId: number;
                    userName: string;
                    workDate: string;
                    minutes: number;
                }[];
            }[];
        };

        const vehicleMap = new Map<number, VehicleAgg>();

        for (const row of rows) {
            const minutes = Number(row.minutes) || 0;
            if (minutes <= 0) continue;

            let vehicle = vehicleMap.get(row.vehicleId);
            if (!vehicle) {
                vehicle = {
                    vehicleId: row.vehicleId,
                    vehicleNumber: row.vehicleNumber,
                    customerName: row.customerName ?? null,
                    desiredDeliveryDate: (row as any).desiredDeliveryDate ?? null,
                    completionDate: (row as any).completionDate ?? null,
                    totalMinutes: 0,
                    processes: [],
                };
                vehicleMap.set(row.vehicleId, vehicle);
            }

            vehicle.totalMinutes += minutes;

            let process = vehicle.processes.find((p) => p.processId === row.processId);
            if (!process) {
                process = {
                    processId: row.processId,
                    processName: row.processName,
                    totalMinutes: 0,
                    details: [],
                };
                vehicle.processes.push(process);
            }

            process.totalMinutes += minutes;
            process.details.push({
                userId: row.userId,
                userName: row.userName || row.userUsername,
                workDate: row.workDate,
                minutes,
            });
        }

        // 各車両ごとに工程・明細をソート
        const vehicles = Array.from(vehicleMap.values()).map((v) => {
            const processes = [...v.processes]
                .map((p) => ({
                    ...p,
                    details: [...p.details].sort((a, b) => {
                        if (a.workDate === b.workDate) {
                            return a.userId - b.userId;
                        }
                        return a.workDate < b.workDate ? -1 : 1;
                    }),
                }))
                .sort((a, b) => b.totalMinutes - a.totalMinutes);

            return {
                ...v,
                processes,
            };
        });

        // 総時間が長い順にソートして返す
        vehicles.sort((a, b) => b.totalMinutes - a.totalMinutes);

        return vehicles;
    }),
});

