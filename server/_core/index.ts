import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import fs from "fs";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initializeDefaultBreakTimes } from "../db";
import { initializeInitialData } from "../init-data";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 8000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  // デフォルトの休憩時間を初期化
  try {
    await initializeDefaultBreakTimes();
  } catch (error) {
    console.warn("[Server] Failed to initialize break times, continuing anyway:", error);
  }

  // 初期データ（ユーザー、工程）を初期化
  try {
    await initializeInitialData();
  } catch (error) {
    console.warn("[Server] Failed to initialize initial data, continuing anyway:", error);
  }

  // 期限切れの営業からの拡散を削除する処理
  const deleteExpiredBroadcasts = async () => {
    try {
      const { getDb, schema } = await import("../db");
      const { lt, inArray } = await import("drizzle-orm");

      const db = await getDb();
      if (!db) return;

      const now = new Date();
      const expiredBroadcasts = await db
        .select()
        .from(schema.salesBroadcasts)
        .where(lt(schema.salesBroadcasts.expiresAt, now));

      if (expiredBroadcasts.length > 0) {
        const expiredIds = expiredBroadcasts.map((b) => b.id);

        // 既読記録も削除
        await db
          .delete(schema.salesBroadcastReads)
          .where(inArray(schema.salesBroadcastReads.broadcastId, expiredIds));

        // 拡散を削除
        await db
          .delete(schema.salesBroadcasts)
          .where(inArray(schema.salesBroadcasts.id, expiredIds));

        console.log(`[自動削除] ${expiredBroadcasts.length}件の期限切れ拡散を削除しました`);
      }
    } catch (error) {
      console.warn("[自動削除] 期限切れ拡散の削除に失敗しました:", error);
    }
  };

  // 期限切れ拡散の自動削除を1時間ごとに実行
  setInterval(deleteExpiredBroadcasts, 60 * 60 * 1000);
  // 起動時にも実行
  deleteExpiredBroadcasts();

  // 自動バックアップ処理（毎日午前3時に実行）
  const scheduleAutoBackup = async () => {
    try {
      // バックアップ作成関数を直接呼び出し
      const { createBackup } = await import("../routers/backup");
      const result = await createBackup();
      console.log(`[自動バックアップ] バックアップを作成しました: ${result.fileName}`);
      console.log(`[自動バックアップ] 記録数:`, result.recordCount);
    } catch (error) {
      console.error("[自動バックアップ] バックアップ作成エラー:", error);
      // エラーが発生してもサーバーは継続して動作する
    }
  };

  // 自動バックアップを毎日午前3時に実行
  const scheduleNextBackup = () => {
    const now = new Date();
    const nextBackup = new Date(now);
    nextBackup.setHours(3, 0, 0, 0);

    // 今日の3時が既に過ぎている場合は、明日の3時を設定
    if (nextBackup <= now) {
      nextBackup.setDate(nextBackup.getDate() + 1);
    }

    const msUntilBackup = nextBackup.getTime() - now.getTime();

    setTimeout(async () => {
      await scheduleAutoBackup();
      // 次回のスケジュールを設定（毎日3時に実行）
      scheduleNextBackup();
    }, msUntilBackup);

    console.log(`[Server] 次回の自動バックアップを ${nextBackup.toLocaleString("ja-JP")} にスケジュールしました`);
  };

  // 初回実行（起動時にもバックアップを作成）
  scheduleAutoBackup();
  // 毎日3時に実行されるようにスケジュール
  scheduleNextBackup();

  // 23:59での自動退勤処理を設定
  const scheduleAutoClose = async () => {
    try {
      const { getDb, schema } = await import("../db");
      const { eq, and, gte, lte, isNull } = await import("drizzle-orm");
      const { startOfDay, endOfDay } = await import("date-fns");
      const { calculateBreakTimeMinutes } = await import("../routers/attendance");

      const db = await getDb();
      if (!db) return;

      const now = new Date();
      const today = new Date(now);
      const start = startOfDay(today);
      const end = endOfDay(today);

      // 今日の未退勤記録を取得
      const unclosedRecords = await db
        .select()
        .from(schema.attendanceRecords)
        .where(
          and(
            gte(schema.attendanceRecords.clockIn, start),
            lte(schema.attendanceRecords.clockIn, end),
            isNull(schema.attendanceRecords.clockOut)
          )
        );

      if (unclosedRecords.length === 0) return;

      let count = 0;

      for (const record of unclosedRecords) {
        // 出勤日の23:59:59に設定
        const clockOutTime = new Date(record.clockIn);
        clockOutTime.setHours(23, 59, 59, 0);

        // 勤務時間を計算（休憩時間を考慮）
        const totalMinutes = Math.floor(
          (clockOutTime.getTime() - record.clockIn.getTime()) / 1000 / 60
        );

        // 休憩時間を計算
        const breakMinutes = await calculateBreakTimeMinutes(record.clockIn, clockOutTime, db);
        const workDuration = Math.max(0, totalMinutes - breakMinutes);

        await db
          .update(schema.attendanceRecords)
          .set({
            clockOut: clockOutTime,
            clockOutDevice: "auto-23:59",
            workDuration,
          })
          .where(eq(schema.attendanceRecords.id, record.id));

        count++;
      }

      if (count > 0) {
        console.log(`[Server] ${count}件の未退勤記録を23:59に自動退勤処理しました`);
      }
    } catch (error) {
      console.error("[Server] 自動退勤スケジュールエラー:", error);
    }
  };

  // 23:59:00に正確に実行するためのスケジュール関数
  const scheduleNextAutoClose = () => {
    const now = new Date();
    const next2359 = new Date(now);
    next2359.setHours(23, 59, 0, 0);

    // 今日の23:59が既に過ぎている場合は、明日の23:59を設定
    if (next2359 <= now) {
      next2359.setDate(next2359.getDate() + 1);
    }

    const msUntil2359 = next2359.getTime() - now.getTime();

    setTimeout(() => {
      scheduleAutoClose();
      // 次回のスケジュールを設定（毎日23:59:00に実行）
      scheduleNextAutoClose();
    }, msUntil2359);

    console.log(`[Server] 次回の自動退勤処理を ${next2359.toLocaleString("ja-JP")} にスケジュールしました`);
  };

  // 初回実行（起動時に未退勤記録があれば処理）
  scheduleAutoClose();

  // 23:59:00に正確に実行されるようにスケジュール
  scheduleNextAutoClose();

  // 念のため、1分ごとにもチェック（バックアップ）
  setInterval(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    // 23:59以降の場合、自動退勤処理を実行
    if (hours === 23 && minutes >= 59) {
      scheduleAutoClose();
    }
  }, 60 * 1000);

  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // アップロードファイルを配信（ディレクトリが無くても必ずルートを登録）
  const uploadsDir = path.resolve(process.cwd(), "uploads");
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
  } catch (error) {
    console.error("[server] アップロードディレクトリ作成に失敗しました:", error);
  }
  app.use("/uploads", express.static(uploadsDir));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "8000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
