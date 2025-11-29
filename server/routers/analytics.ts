import { createTRPCRouter, protectedProcedure } from "../_core/trpc";
import { getDb, getPool, schema } from "../db";
import { eq, sql, inArray } from "drizzle-orm";
import { z } from "zod";

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
     * 営業日を計算するヘルパー関数（土日を除く）
     * 今日から過去に遡って、指定された営業日数分の日付を返す
     */
    getBusinessDaysAgo: protectedProcedure
        .input(z.object({ days: z.number() }))
        .query(async ({ input }) => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dates: Date[] = [];
            let currentDate = new Date(today);
            currentDate.setDate(currentDate.getDate() - 1); // 昨日から開始

            while (dates.length < input.days) {
                const dayOfWeek = currentDate.getDay();
                // 0=日曜, 6=土曜をスキップ
                if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                    dates.push(new Date(currentDate));
                }
                currentDate.setDate(currentDate.getDate() - 1);
            }

            return dates.map((d) => d.toISOString().slice(0, 10));
        }),

    /**
     * 現場スタッフ（field_worker）で、
     * - 過去3営業日のいずれかの日に出勤していて
     * - 「出勤記録の勤務時間 - 1時間(休憩) - 30分」の作業記録が入っていない日があるユーザーを取得
     *
     * 勤務時間は以下の優先順位で算出する:
     *  1. attendanceRecords.workMinutes が入っていればそれを使用
     *  2. なければ workDate + clockInTime / clockOutTime から TIMESTAMPDIFF で分数計算
     *
     * 例:
     *  - 出勤記録: 9時間（540分）
     *  - 期待する作業記録: 540 - 90 = 450分（7.5時間）
     *  - 作業記録合計が 450分 未満なら「作業報告未入力」とみなす
     *
     * この条件から外れれば（作業記録が増えて条件を満たせば）、自動的に一覧から消える。
     */
    getRecentLowWorkUsers: protectedProcedure.query(async () => {
        const db = await getDb();
        if (!db) {
            return [];
        }

        // 過去3営業日を計算（土日を除く）
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const businessDates: string[] = [];
        let currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() - 1); // 昨日から開始

        while (businessDates.length < 3) {
            const dayOfWeek = currentDate.getDay();
            // 0=日曜, 6=土曜をスキップ
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                businessDates.push(currentDate.toISOString().slice(0, 10));
            }
            currentDate.setDate(currentDate.getDate() - 1);
        }

        if (businessDates.length === 0) {
            return [];
        }

        // attendanceRecords と workRecords を結合して、「過去3営業日の出勤日 × ユーザー」の作業時間を集計
        const pool = getPool();
        if (!pool) {
            return [];
        }

        const datePlaceholders = businessDates.map(() => "?").join(",");
        const query = `
            SELECT
                ar.userId AS userId,
                COALESCE(u.name, u.username) AS userName,
                ar.workDate AS workDate,
                COALESCE(
                    SUM(
                        CASE
                            WHEN wr.id IS NOT NULL
                            THEN TIMESTAMPDIFF(
                                MINUTE,
                                wr.startTime,
                                COALESCE(wr.endTime, NOW())
                            )
                            ELSE 0
                        END
                    ),
                    0
                ) AS workMinutes,
                GREATEST(
                    COALESCE(
                        ar.workMinutes,
                        TIMESTAMPDIFF(
                            MINUTE,
                            STR_TO_DATE(CONCAT(ar.workDate, ' ', ar.clockInTime), '%Y-%m-%d %H:%i'),
                            STR_TO_DATE(CONCAT(ar.workDate, ' ', ar.clockOutTime), '%Y-%m-%d %H:%i')
                        ),
                        0
                    ) - 90,
                    0
                ) AS expectedWorkMinutes
            FROM \`attendanceRecords\` ar
            INNER JOIN \`users\` u ON u.id = ar.userId
            LEFT JOIN \`workRecords\` wr
                ON wr.userId = ar.userId
                AND DATE(wr.startTime) = ar.workDate
            WHERE
                ar.workDate IN (${datePlaceholders})
                AND ar.clockInTime IS NOT NULL
                AND u.role = 'field_worker'
            GROUP BY
                ar.userId,
                u.name,
                u.username,
                ar.workDate,
                expectedWorkMinutes
            HAVING
                expectedWorkMinutes > 0
                AND workMinutes < expectedWorkMinutes
        `;
        const [rows]: any = await pool.execute(query, businessDates);

        type Row = {
            userId: number;
            userName: string;
            workDate: string | Date;
            workMinutes: number;
            expectedWorkMinutes: number;
        };

        const map = new Map<
            number,
            {
                userId: number;
                userName: string;
                dates: string[];
            }
        >();

        for (const r of rows as Row[]) {
            const userId = Number((r as any).userId);
            const userName = (r as any).userName as string;
            const workDate =
                typeof r.workDate === "string"
                    ? r.workDate
                    : (r.workDate as Date).toISOString().slice(0, 10);

            if (!map.has(userId)) {
                map.set(userId, { userId, userName, dates: [] });
            }
            const entry = map.get(userId)!;
            if (!entry.dates.includes(workDate)) {
                entry.dates.push(workDate);
            }
        }

        // 日付は新しい順に並べる
        const result = Array.from(map.values()).map((v) => ({
            ...v,
            dates: v.dates.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)),
        }));

        return result;
    }),

    /**
     * 作業報告が出勤時間を超えている可能性があるユーザーを取得
     * - 過去3営業日のいずれかの日に出勤していて
     * - その日の作業記録の合計が、出勤記録の勤務時間を30分以上超えているユーザーを取得
     * - 30分以内の超過は許容範囲として警告を出さない
     */
    getExcessiveWorkUsers: protectedProcedure.query(async () => {
        const db = await getDb();
        if (!db) {
            return [];
        }

        // 過去3営業日を計算（土日を除く）
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const businessDates: string[] = [];
        let currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() - 1); // 昨日から開始

        while (businessDates.length < 3) {
            const dayOfWeek = currentDate.getDay();
            // 0=日曜, 6=土曜をスキップ
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                businessDates.push(currentDate.toISOString().slice(0, 10));
            }
            currentDate.setDate(currentDate.getDate() - 1);
        }

        if (businessDates.length === 0) {
            return [];
        }

        const pool = getPool();
        if (!pool) {
            return [];
        }

        const datePlaceholders = businessDates.map(() => "?").join(",");
        const query = `
            SELECT
                ar.userId AS userId,
                COALESCE(u.name, u.username) AS userName,
                ar.workDate AS workDate,
                COALESCE(
                    SUM(
                        CASE
                            WHEN wr.id IS NOT NULL
                            THEN TIMESTAMPDIFF(
                                MINUTE,
                                wr.startTime,
                                COALESCE(wr.endTime, NOW())
                            )
                            ELSE 0
                        END
                    ),
                    0
                ) AS workMinutes,
                COALESCE(
                    ar.workMinutes,
                    TIMESTAMPDIFF(
                        MINUTE,
                        STR_TO_DATE(CONCAT(ar.workDate, ' ', ar.clockInTime), '%Y-%m-%d %H:%i'),
                        STR_TO_DATE(CONCAT(ar.workDate, ' ', ar.clockOutTime), '%Y-%m-%d %H:%i')
                    ),
                    0
                ) AS attendanceMinutes
            FROM \`attendanceRecords\` ar
            INNER JOIN \`users\` u ON u.id = ar.userId
            LEFT JOIN \`workRecords\` wr
                ON wr.userId = ar.userId
                AND DATE(wr.startTime) = ar.workDate
            WHERE
                ar.workDate IN (${datePlaceholders})
                AND ar.clockInTime IS NOT NULL
                AND u.role = 'field_worker'
            GROUP BY
                ar.userId,
                u.name,
                u.username,
                ar.workDate,
                attendanceMinutes
            HAVING
                attendanceMinutes > 0
                AND workMinutes > (attendanceMinutes + 30)
        `;
        const [rows]: any = await pool.execute(query, businessDates);

        type Row = {
            userId: number;
            userName: string;
            workDate: string | Date;
            workMinutes: number;
            attendanceMinutes: number;
        };

        const map = new Map<
            number,
            {
                userId: number;
                userName: string;
                dates: string[];
            }
        >();

        for (const r of rows as Row[]) {
            const userId = Number((r as any).userId);
            const userName = (r as any).userName as string;
            const workDate =
                typeof r.workDate === "string"
                    ? r.workDate
                    : (r.workDate as Date).toISOString().slice(0, 10);

            if (!map.has(userId)) {
                map.set(userId, { userId, userName, dates: [] });
            }
            const entry = map.get(userId)!;
            if (!entry.dates.includes(workDate)) {
                entry.dates.push(workDate);
            }
        }

        // 日付は新しい順に並べる
        const result = Array.from(map.values()).map((v) => ({
            ...v,
            dates: v.dates.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)),
        }));

        return result;
    }),

    /**
     * 特定ユーザーの特定日の作業報告詳細を取得
     * - 出勤時間と作業時間の比較
     * - 各作業記録の詳細
     */
    getWorkReportDetail: protectedProcedure
        .input(
            z.object({
                userId: z.number(),
                workDate: z.string(), // "YYYY-MM-DD"
            })
        )
        .query(async ({ input }) => {
            const db = await getDb();
            if (!db) {
                throw new Error("データベースに接続できません");
            }

            const pool = getPool();
            if (!pool) {
                throw new Error("データベースプールに接続できません");
            }

            // 出勤記録を取得
            const attendanceQuery = `
                SELECT
                    ar.id AS attendanceId,
                    ar.workDate,
                    ar.clockInTime,
                    ar.clockOutTime,
                    ar.workMinutes AS attendanceWorkMinutes,
                    COALESCE(
                        ar.workMinutes,
                        TIMESTAMPDIFF(
                            MINUTE,
                            STR_TO_DATE(CONCAT(ar.workDate, ' ', ar.clockInTime), '%Y-%m-%d %H:%i'),
                            STR_TO_DATE(CONCAT(ar.workDate, ' ', ar.clockOutTime), '%Y-%m-%d %H:%i')
                        ),
                        0
                    ) AS attendanceMinutes,
                    COALESCE(u.name, u.username) AS userName
                FROM \`attendanceRecords\` ar
                INNER JOIN \`users\` u ON u.id = ar.userId
                WHERE
                    ar.userId = ?
                    AND ar.workDate = ?
                    AND ar.clockInTime IS NOT NULL
                LIMIT 1
            `;
            const [attendanceRows]: any = await pool.execute(attendanceQuery, [
                input.userId,
                input.workDate,
            ]);

            if (!attendanceRows || attendanceRows.length === 0) {
                return {
                    userId: input.userId,
                    workDate: input.workDate,
                    userName: null,
                    attendance: null,
                    workRecords: [],
                    summary: {
                        attendanceMinutes: 0,
                        workMinutes: 0,
                        differenceMinutes: 0,
                    },
                };
            }

            const attendance = attendanceRows[0];
            const attendanceMinutes = Number(attendance.attendanceMinutes) || 0;
            const userName = attendance.userName;

            // 作業記録を取得
            const workRecordsQuery = `
                SELECT
                    wr.id,
                    wr.startTime,
                    wr.endTime,
                    TIMESTAMPDIFF(
                        MINUTE,
                        wr.startTime,
                        COALESCE(wr.endTime, NOW())
                    ) AS durationMinutes,
                    v.vehicleNumber,
                    v.customerName,
                    p.name AS processName,
                    wr.workDescription
                FROM \`workRecords\` wr
                LEFT JOIN \`vehicles\` v ON v.id = wr.vehicleId
                LEFT JOIN \`processes\` p ON p.id = wr.processId
                WHERE
                    wr.userId = ?
                    AND DATE(wr.startTime) = ?
                ORDER BY wr.startTime ASC
            `;
            const [workRecordsRows]: any = await pool.execute(workRecordsQuery, [
                input.userId,
                input.workDate,
            ]);

            const workRecords = (workRecordsRows || []).map((row: any) => ({
                id: row.id,
                startTime: row.startTime,
                endTime: row.endTime,
                durationMinutes: Number(row.durationMinutes) || 0,
                vehicleNumber: row.vehicleNumber || "不明",
                customerName: row.customerName || null,
                processName: row.processName || "不明",
                workDescription: row.workDescription || null,
            }));

            const workMinutes = workRecords.reduce(
                (sum: number, record: any) => sum + record.durationMinutes,
                0
            );

            return {
                userId: input.userId,
                workDate: input.workDate,
                userName,
                attendance: {
                    id: attendance.attendanceId,
                    workDate: attendance.workDate,
                    clockInTime: attendance.clockInTime,
                    clockOutTime: attendance.clockOutTime,
                    attendanceMinutes,
                },
                workRecords,
                summary: {
                    attendanceMinutes,
                    workMinutes,
                    differenceMinutes: workMinutes - attendanceMinutes,
                },
            };
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

