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
});

