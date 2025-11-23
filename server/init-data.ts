import bcrypt from "bcryptjs";
import { getDb, schema } from "./db";

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
            role: "user",
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

