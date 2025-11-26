import bcrypt from "bcryptjs";
import { eq, like } from "drizzle-orm";
import { getDb, schema } from "./db";
import { ENV } from "./_core/env";

export async function initializeInitialData() {
    const db = await getDb();
    if (!db) {
        console.warn("[Init] Database not available, skipping initialization");
        return;
    }

    try {
        // 1. 初期ユーザーの作成
        await initializeUsers(db);

        // 2. 初期工程の作成
        await initializeProcesses(db);

        // 3. 開発環境のみサンプルデータを投入
        if (!ENV.isProduction) {
            await initializeSampleData(db);
        }

        console.log("[Init] Initial data initialized successfully");
    } catch (error) {
        console.error("[Init] Failed to initialize initial data:", error);
    }
}

async function initializeUsers(db: any) {
    try {
        // 既存のユーザーを確認
        const existingUsers = await db.select().from(schema.users).limit(1);
        if (existingUsers.length > 0) {
            console.log("[Init] Users already exist, skipping user initialization");
            return;
        }
    } catch (error) {
        console.warn("[Init] Failed to check existing users:", error);
        return;
    }

    // 管理者アカウント
    const adminPassword = await bcrypt.hash("admin123", 10);
    await db.insert(schema.users).values({
        username: "admin",
        password: adminPassword,
        name: "管理者",
        role: "admin",
    });

    // スタッフアカウント（40人）
    const staffPassword = await bcrypt.hash("password", 10);
    const staffUsers = [];
    for (let i = 1; i <= 40; i++) {
        const username = `user${String(i).padStart(3, "0")}`;
        staffUsers.push({
            username,
            password: staffPassword,
            name: `スタッフ${i}`,
            role: "field_worker",
        });
    }

    // バッチで挿入（1000件ずつ）
    for (let i = 0; i < staffUsers.length; i += 1000) {
        const batch = staffUsers.slice(i, i + 1000);
        await db.insert(schema.users).values(batch);
    }

    console.log("[Init] Created admin account (admin/admin123) and 40 staff accounts (user001-user040/password)");
}

async function initializeProcesses(db: any) {
    try {
        // 既存の工程を確認
        const existingProcesses = await db.select().from(schema.processes).limit(1);
        if (existingProcesses.length > 0) {
            console.log("[Init] Processes already exist, skipping process initialization");
            return;
        }
    } catch (error) {
        console.warn("[Init] Failed to check existing processes:", error);
        return;
    }

    const processes = [
        { name: "下地", description: "断熱、根太、FFヒーター", majorCategory: "下地", minorCategory: "断熱", displayOrder: 1 },
        { name: "地設", description: "地設", majorCategory: "地設", minorCategory: "地設", displayOrder: 2 },
        { name: "家具", description: "家具", majorCategory: "家具", minorCategory: "家具", displayOrder: 3 },
        { name: "仕上げ", description: "床張り、壁張り、天井張り、家具取り付け", majorCategory: "仕上げ", minorCategory: "床張り", displayOrder: 4 },
        { name: "搬移転", description: "搬移転", majorCategory: "搬移転", minorCategory: "搬移転", displayOrder: 5 },
        { name: "登録", description: "登録", majorCategory: "登録", minorCategory: "登録", displayOrder: 6 },
        { name: "雑製", description: "雑製", majorCategory: "雑製", minorCategory: "雑製", displayOrder: 7 },
        { name: "FRP", description: "FRP", majorCategory: "FRP", minorCategory: "FRP", displayOrder: 8 },
        { name: "修理", description: "修理", majorCategory: "修理", minorCategory: "修理", displayOrder: 9 },
        { name: "掃除", description: "掃除", majorCategory: "掃除", minorCategory: "掃除", displayOrder: 10 },
    ];

    await db.insert(schema.processes).values(processes);
    console.log("[Init] Created 10 initial processes");
}

/**
 * 開発用のサンプルデータを投入する
 * - スタッフ: sample_staff01〜sample_staff40
 * - 車両: SAMPLE-001〜SAMPLE-005
 * - チェック項目: サンプルチェック01〜サンプルチェック30
 */
async function initializeSampleData(db: any) {
    try {
        console.log("[Init] Initializing sample data (users, vehicles, checkItems)...");

        // 1. スタッフサンプル 40人
        try {
            const existingSampleUsers = await db
                .select({ username: schema.users.username })
                .from(schema.users)
                .where(like(schema.users.username, "sample_staff%"))
                .limit(1);

            if (existingSampleUsers.length === 0) {
                const passwordHash = await bcrypt.hash("password", 10);
                const sampleUsers = [];
                for (let i = 1; i <= 40; i++) {
                    const no = String(i).padStart(2, "0");
                    sampleUsers.push({
                        username: `sample_staff${no}`,
                        password: passwordHash,
                        name: `スタッフ${no}`,
                        role: "field_worker" as const,
                    });
                }
                await db.insert(schema.users).values(sampleUsers);
                console.log("[Init] Created 40 sample staff users (sample_staff01-sample_staff40/password)");
            } else {
                console.log("[Init] Sample staff users already exist, skipping");
            }
        } catch (error) {
            console.warn("[Init] Failed to initialize sample staff users:", error);
        }

        // 2. 車両サンプル 5台
        try {
            const existingSampleVehicles = await db
                .select({ id: schema.vehicles.id })
                .from(schema.vehicles)
                .where(like(schema.vehicles.vehicleNumber, "SAMPLE-%"))
                .limit(1);

            if (existingSampleVehicles.length === 0) {
                // 車種マスタがなければスキップ
                const vehicleTypes = await db
                    .select({ id: schema.vehicleTypes.id })
                    .from(schema.vehicleTypes)
                    .limit(1);
                if (vehicleTypes.length === 0) {
                    console.warn("[Init] No vehicleTypes found, skipping sample vehicles");
                } else {
                    const vehicleTypeId = vehicleTypes[0].id;
                    const sampleVehicles = [];
                    const categories: (typeof schema.vehicles.$inferInsert)["category"][] = ["一般", "キャンパー", "中古", "修理", "クレーム"];
                    for (let i = 1; i <= 5; i++) {
                        const no = String(i).padStart(3, "0");
                        sampleVehicles.push({
                            vehicleNumber: `SAMPLE-${no}`,
                            vehicleTypeId,
                            category: categories[(i - 1) % categories.length],
                            customerName: `サンプル顧客${i}`,
                            status: "in_progress" as const,
                        });
                    }
                    await db.insert(schema.vehicles).values(sampleVehicles);
                    console.log("[Init] Created 5 sample vehicles (SAMPLE-001〜SAMPLE-005)");
                }
            } else {
                console.log("[Init] Sample vehicles already exist, skipping");
            }
        } catch (error) {
            console.warn("[Init] Failed to initialize sample vehicles:", error);
        }

        // 3. チェック項目サンプル 30個
        try {
            const existingSampleCheckItems = await db
                .select({ id: schema.checkItems.id })
                .from(schema.checkItems)
                .where(like(schema.checkItems.name, "サンプルチェック%"))
                .limit(1);

            if (existingSampleCheckItems.length === 0) {
                const sampleCheckItems = [];
                const categories: (typeof schema.checkItems.$inferInsert)["category"][] = ["一般", "キャンパー", "中古", "修理", "クレーム"];
                for (let i = 1; i <= 30; i++) {
                    const no = String(i).padStart(2, "0");
                    sampleCheckItems.push({
                        category: categories[(i - 1) % categories.length],
                        majorCategory: "サンプル",
                        minorCategory: `グループ${Math.ceil(i / 5)}`,
                        name: `サンプルチェック${no}`,
                        description: `サンプル用チェック項目 ${no}`,
                        displayOrder: i,
                    });
                }
                await db.insert(schema.checkItems).values(sampleCheckItems);
                console.log("[Init] Created 30 sample check items (サンプルチェック01〜30)");
            } else {
                console.log("[Init] Sample check items already exist, skipping");
            }
        } catch (error) {
            console.warn("[Init] Failed to initialize sample check items:", error);
        }

        // 4. ユーザー管理の表示名・ロールを一括更新（ID 2〜32）
        try {
            const userUpdates: { id: number; name: string; role: "field_worker" | "sales_office" | "sub_admin" | "admin" }[] = [
                { id: 2, name: "加藤健資", role: "admin" },
                { id: 3, name: "古澤清隆", role: "admin" },
                { id: 4, name: "野島悟", role: "field_worker" },
                { id: 5, name: "目黒弥須子", role: "field_worker" },
                { id: 6, name: "齋藤祐美", role: "field_worker" },
                { id: 7, name: "高野晴香", role: "field_worker" },
                { id: 8, name: "渡邊千尋", role: "field_worker" },
                { id: 9, name: "金子真由美", role: "field_worker" },
                { id: 10, name: "高野涼香", role: "field_worker" },
                { id: 11, name: "澁木芳美", role: "field_worker" },
                { id: 12, name: "樋口義則", role: "field_worker" },
                { id: 13, name: "太田千明", role: "field_worker" },
                { id: 14, name: "山崎正昭", role: "field_worker" },
                { id: 15, name: "落合岳朗", role: "field_worker" },
                { id: 16, name: "澁木健治郎", role: "field_worker" },
                { id: 17, name: "近藤一樹", role: "field_worker" },
                { id: 18, name: "松永旭生", role: "field_worker" },
                { id: 19, name: "鈴木竜輔", role: "field_worker" },
                { id: 20, name: "斉藤政春", role: "field_worker" },
                { id: 21, name: "土田宏子", role: "field_worker" },
                { id: 22, name: "笠井　猛", role: "field_worker" },
                { id: 23, name: "頓所　歩", role: "field_worker" },
                { id: 24, name: "永井富美華", role: "field_worker" },
                { id: 25, name: "関根光繁", role: "field_worker" },
                { id: 26, name: "青池和磨", role: "field_worker" },
                { id: 27, name: "星　英子", role: "field_worker" },
                { id: 28, name: "浅見道則", role: "field_worker" },
                { id: 29, name: "不破俊典", role: "field_worker" },
                { id: 30, name: "服部　亮", role: "field_worker" },
                { id: 31, name: "渡辺ゆり夏", role: "field_worker" },
                { id: 32, name: "内田　陽", role: "field_worker" },
            ];

            for (const u of userUpdates) {
                await db
                    .update(schema.users)
                    .set({ name: u.name, role: u.role })
                    .where(eq(schema.users.id, u.id));
            }
            console.log("[Init] Updated display names and roles for users id 2-32");
        } catch (error) {
            console.warn("[Init] Failed to update user display names:", error);
        }

        // 5. ユーザー名を ID に合わせてリネーム（ID1→admin, ID2→user001, ..., ID42→user041）
        try {
            for (let id = 1; id <= 42; id++) {
                const username = id === 1 ? "admin" : `user${String(id - 1).padStart(3, "0")}`;
                await db
                    .update(schema.users)
                    .set({ username })
                    .where(eq(schema.users.id, id));
            }
            console.log("[Init] Updated usernames for users id 1-42 (admin, user001-user041)");
        } catch (error) {
            console.warn("[Init] Failed to update usernames:", error);
        }

        console.log("[Init] Sample data initialization completed");
    } catch (error) {
        console.warn("[Init] Failed to initialize sample data:", error);
    }
}

