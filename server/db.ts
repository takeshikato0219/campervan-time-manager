import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import * as schema from "../drizzle/schema";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export async function getDb() {
    if (!_db && ENV.databaseUrl) {
        try {
            const connection = await createConnection(ENV.databaseUrl);
            _db = drizzle(connection, { schema, mode: "default" });
        } catch (error) {
            console.warn("[Database] Failed to connect:", error);
            _db = null;
        }
    }
    return _db;
}

export async function getUserByUsername(username: string) {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    return result[0];
}

export async function getUserById(id: number) {
    const db = await getDb();
    if (!db) return undefined;
    const result = await db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return result[0];
}

// 後方互換性のため（既存コードで使用されている可能性がある）
export async function getUserByOpenId(openId: string) {
    return getUserByUsername(openId);
}

export async function initializeDefaultBreakTimes() {
    const db = await getDb();
    if (!db) {
        console.warn("[Database] Cannot initialize break times: database not available");
        return;
    }

    try {
        // 既存の休憩時間を確認
        const existing = await db.select().from(schema.breakTimes).limit(1);
        if (existing.length > 0) {
            console.log("[Database] Break times already initialized");
            return;
        }

        // デフォルトの休憩時間を設定（12:00-13:20 = 80分）
        await db.insert(schema.breakTimes).values({
            name: "昼休憩",
            startTime: "12:00",
            endTime: "13:20",
            durationMinutes: 80,
            isActive: "true",
        });

        console.log("[Database] Default break times initialized");
    } catch (error) {
        console.warn("[Database] Failed to initialize break times:", error);
    }
}

// スキーマをエクスポート
export { schema };

