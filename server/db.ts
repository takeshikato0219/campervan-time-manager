import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2/promise";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import * as schema from "../drizzle/schema";

type DbType = ReturnType<typeof drizzle<typeof schema>>;
let _db: DbType | null = null;
let _pool: Pool | null = null;

/**
 * データベース接続を取得（接続プールを使用）
 * 接続が切れた場合、自動的に再接続を試みる
 */
export async function getDb(): Promise<DbType | null> {
    if (!ENV.databaseUrl) {
        console.warn("[Database] DATABASE_URL is not set");
        return null;
    }

    // 接続プールが存在しない、または接続が切れている場合は再作成
    if (!_pool || !_db) {
        try {
            // 既存の接続プールを閉じる
            if (_pool) {
                try {
                    await _pool.end();
                } catch (error) {
                    console.warn("[Database] Error closing old pool:", error);
                }
            }

            // 新しい接続プールを作成
            _pool = createPool(ENV.databaseUrl);

            _db = drizzle(_pool, { schema, mode: "default" }) as unknown as DbType;
            console.log("[Database] Database connection pool created");
        } catch (error) {
            console.error("[Database] Failed to create connection pool:", error);
            _db = null;
            _pool = null;
            return null;
        }
    }

    // 接続が有効か確認（簡単なクエリを実行）
    if (_db) {
        try {
            // 存在が保証されている基本カラムのみでテスト
            await _db.select({
                id: schema.users.id,
                username: schema.users.username,
            }).from(schema.users).limit(1);
        } catch (error: any) {
            // カラムが存在しないエラーの場合は、接続自体は成功しているとみなす
            if (error?.message?.includes("category") || error?.message?.includes("name") || error?.code === "ER_BAD_FIELD_ERROR") {
                console.log("[Database] Connection test: some columns missing, but connection is valid");
                return _db;
            }
            console.warn("[Database] Connection test failed:", error.message);
            // 接続エラーの場合は、接続プールをリセットして再試行
            _db = null;
            if (_pool) {
                try {
                    await _pool.end();
                } catch (e) {
                    // 無視
                }
            }
            _pool = null;
            // 再試行は呼び出し側で行う（無限ループを防ぐ）
            return null;
        }
    }

    return _db;
}

/**
 * ユーザー情報を安全に取得する（nameやcategoryカラムが存在しない場合に対応）
 */
export async function selectUsersSafely(db: Awaited<ReturnType<typeof getDb>>, where?: any) {
    if (!db) return [];

    try {
        // まず全カラムを取得を試みる
        const baseSelect = {
            id: schema.users.id,
            username: schema.users.username,
            password: schema.users.password,
            name: schema.users.name,
            role: schema.users.role,
            category: schema.users.category,
            createdAt: schema.users.createdAt,
            updatedAt: schema.users.updatedAt,
        };

        let query = db.select(baseSelect).from(schema.users);
        if (where) {
            query = query.where(where) as any;
        }
        const result = await query;
        return result;
    } catch (error: any) {
        // nameまたはcategoryカラムが存在しない場合は、基本カラムのみで取得
        if (error?.message?.includes("category") || error?.message?.includes("name") || error?.code === "ER_BAD_FIELD_ERROR") {
            try {
                const baseSelect = {
                    id: schema.users.id,
                    username: schema.users.username,
                    password: schema.users.password,
                    role: schema.users.role,
                    createdAt: schema.users.createdAt,
                    updatedAt: schema.users.updatedAt,
                };

                let query = db.select(baseSelect).from(schema.users);
                if (where) {
                    query = query.where(where) as any;
                }
                const result = await query;
                return result.map((u: any) => ({ ...u, name: null, category: null }));
            } catch (innerError: any) {
                // それでもエラーが発生する場合は、最小限のカラムのみで取得
                const baseSelect = {
                    id: schema.users.id,
                    username: schema.users.username,
                    password: schema.users.password,
                    role: schema.users.role,
                };

                let query = db.select(baseSelect).from(schema.users);
                if (where) {
                    query = query.where(where) as any;
                }
                const result = await query;
                return result.map((u: any) => ({ ...u, name: null, category: null, createdAt: null, updatedAt: null }));
            }
        }
        throw error;
    }
}

export async function getUserByUsername(username: string) {
    const db = await getDb();
    if (!db) return undefined;
    try {
        const users = await selectUsersSafely(db, eq(schema.users.username, username));
        return users[0];
    } catch (error) {
        console.error("[getUserByUsername] Error:", error);
        return undefined;
    }
}

export async function getUserById(id: number) {
    const db = await getDb();
    if (!db) return undefined;
    try {
        const users = await selectUsersSafely(db, eq(schema.users.id, id));
        return users[0];
    } catch (error) {
        console.error("[getUserById] Error:", error);
        return undefined;
    }
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
