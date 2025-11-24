var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/index.ts
import "dotenv/config";
import express2 from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// server/_core/oauth.ts
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", (_req, res) => {
    res.status(501).json({ error: "OAuth not implemented" });
  });
}

// server/_core/trpc.ts
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var createTRPCRouter = t.router;
var publicProcedure = t.procedure;
var protectedProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
var adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});

// server/routers/auth.ts
import { TRPCError as TRPCError2 } from "@trpc/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

// server/db.ts
import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import { eq } from "drizzle-orm";

// server/_core/env.ts
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? ""
};

// drizzle/schema.ts
var schema_exports = {};
__export(schema_exports, {
  attendanceEditLogs: () => attendanceEditLogs,
  attendanceRecords: () => attendanceRecords,
  breakTimes: () => breakTimes,
  feedbackComments: () => feedbackComments,
  notifications: () => notifications,
  processes: () => processes,
  users: () => users,
  vehicleMemos: () => vehicleMemos,
  vehicleProcessTargets: () => vehicleProcessTargets,
  vehicleTypeProcessStandards: () => vehicleTypeProcessStandards,
  vehicleTypes: () => vehicleTypes,
  vehicles: () => vehicles,
  workRecords: () => workRecords
});
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date } from "drizzle-orm/mysql-core";
var users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  password: text("password").notNull(),
  name: text("name"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var attendanceRecords = mysqlTable("attendanceRecords", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clockIn: timestamp("clockIn").notNull(),
  clockOut: timestamp("clockOut"),
  workDuration: int("workDuration"),
  clockInDevice: varchar("clockInDevice", { length: 50 }),
  clockOutDevice: varchar("clockOutDevice", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var attendanceEditLogs = mysqlTable("attendanceEditLogs", {
  id: int("id").autoincrement().primaryKey(),
  attendanceId: int("attendanceId").notNull(),
  editorId: int("editorId").notNull(),
  fieldName: varchar("fieldName", { length: 50 }).notNull(),
  oldValue: timestamp("oldValue"),
  newValue: timestamp("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});
var workRecords = mysqlTable("workRecords", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  vehicleId: int("vehicleId").notNull(),
  processId: int("processId").notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime"),
  workDescription: text("workDescription"),
  photoUrls: text("photoUrls"),
  videoUrls: text("videoUrls"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var vehicles = mysqlTable("vehicles", {
  id: int("id").autoincrement().primaryKey(),
  vehicleNumber: varchar("vehicleNumber", { length: 100 }).notNull(),
  vehicleTypeId: int("vehicleTypeId").notNull(),
  customerName: varchar("customerName", { length: 255 }),
  desiredDeliveryDate: date("desiredDeliveryDate"),
  completionDate: date("completionDate"),
  status: mysqlEnum("status", ["in_progress", "completed", "archived"]).default("in_progress").notNull(),
  targetTotalMinutes: int("targetTotalMinutes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var vehicleTypes = mysqlTable("vehicleTypes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  standardTotalMinutes: int("standardTotalMinutes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var processes = mysqlTable("processes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  majorCategory: varchar("majorCategory", { length: 100 }),
  minorCategory: varchar("minorCategory", { length: 100 }),
  displayOrder: int("displayOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var vehicleProcessTargets = mysqlTable("vehicleProcessTargets", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  processId: int("processId").notNull(),
  targetMinutes: int("targetMinutes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var vehicleTypeProcessStandards = mysqlTable("vehicleTypeProcessStandards", {
  id: int("id").autoincrement().primaryKey(),
  vehicleTypeId: int("vehicleTypeId").notNull(),
  processId: int("processId").notNull(),
  standardMinutes: int("standardMinutes").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var breakTimes = mysqlTable("breakTimes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  startTime: varchar("startTime", { length: 10 }).notNull(),
  // "HH:MM"
  endTime: varchar("endTime", { length: 10 }).notNull(),
  // "HH:MM"
  durationMinutes: int("durationMinutes").notNull(),
  isActive: mysqlEnum("isActive", ["true", "false"]).default("true").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var vehicleMemos = mysqlTable("vehicleMemos", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: int("vehicleId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var feedbackComments = mysqlTable("feedbackComments", {
  id: int("id").autoincrement().primaryKey(),
  workRecordId: int("workRecordId").notNull(),
  userId: int("userId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
});
var notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message").notNull(),
  type: mysqlEnum("type", ["info", "warning", "error"]).default("info").notNull(),
  isRead: mysqlEnum("isRead", ["true", "false"]).default("false").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull()
});

// server/db.ts
var _db = null;
async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      const connection = await createConnection(ENV.databaseUrl);
      _db = drizzle(connection, { schema: schema_exports, mode: "default" });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
async function getUserByUsername(username) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0];
}
async function getUserById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0];
}
async function initializeDefaultBreakTimes() {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot initialize break times: database not available");
    return;
  }
  try {
    const existing = await db.select().from(breakTimes).limit(1);
    if (existing.length > 0) {
      console.log("[Database] Break times already initialized");
      return;
    }
    await db.insert(breakTimes).values({
      name: "\u663C\u4F11\u61A9",
      startTime: "12:00",
      endTime: "13:20",
      durationMinutes: 80,
      isActive: "true"
    });
    console.log("[Database] Default break times initialized");
  } catch (error) {
    console.warn("[Database] Failed to initialize break times:", error);
  }
}

// server/_core/cookies.ts
import { parse } from "cookie";
import { jwtVerify, SignJWT } from "jose";
var COOKIE_NAME = "campervan_session";
async function getUserIdFromCookie(req) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;
  const cookies = parse(cookieHeader);
  const token = cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const secret = new TextEncoder().encode(ENV.cookieSecret);
    const { payload } = await jwtVerify(token, secret);
    return payload.sub;
  } catch {
    return null;
  }
}
async function setAuthCookie(res, userId) {
  const secret = new TextEncoder().encode(ENV.cookieSecret);
  const token = await new SignJWT({ sub: userId.toString() }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(secret);
  const isProduction = ENV.isProduction;
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 60 * 60}; ${isProduction ? "Secure; SameSite=Strict" : "SameSite=Lax"}`
  );
}
function clearAuthCookie(res) {
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
  );
}

// server/routers/auth.ts
var authRouter = createTRPCRouter({
  login: publicProcedure.input(
    z.object({
      username: z.string(),
      password: z.string()
    })
  ).mutation(async ({ input, ctx }) => {
    try {
      console.log("[Auth] Login attempt:", { username: input.username });
      const user = await getUserByUsername(input.username);
      if (!user) {
        console.log("[Auth] User not found:", input.username);
        throw new TRPCError2({
          code: "UNAUTHORIZED",
          message: "\u30E6\u30FC\u30B6\u30FC\u540D\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093"
        });
      }
      console.log("[Auth] User found:", { id: user.id, username: user.username, role: user.role });
      const isValid = await bcrypt.compare(input.password, user.password);
      if (!isValid) {
        console.log("[Auth] Password mismatch for user:", input.username);
        throw new TRPCError2({
          code: "UNAUTHORIZED",
          message: "\u30E6\u30FC\u30B6\u30FC\u540D\u307E\u305F\u306F\u30D1\u30B9\u30EF\u30FC\u30C9\u304C\u6B63\u3057\u304F\u3042\u308A\u307E\u305B\u3093"
        });
      }
      console.log("[Auth] Password verified, setting cookie for user:", user.id);
      await setAuthCookie(ctx.res, user.id);
      console.log("[Auth] Login successful for user:", user.username);
      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          name: user.name,
          role: user.role
        }
      };
    } catch (error) {
      if (error instanceof TRPCError2) {
        throw error;
      }
      console.error("[Auth] Login error:", error);
      throw new TRPCError2({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "\u30ED\u30B0\u30A4\u30F3\u51E6\u7406\u4E2D\u306B\u30A8\u30E9\u30FC\u304C\u767A\u751F\u3057\u307E\u3057\u305F"
      });
    }
  }),
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      return null;
    }
    return {
      id: ctx.user.id,
      username: ctx.user.username,
      name: ctx.user.name,
      role: ctx.user.role
    };
  }),
  logout: publicProcedure.mutation(async ({ ctx }) => {
    clearAuthCookie(ctx.res);
    return { success: true };
  })
});

// server/routers/attendance.ts
import { TRPCError as TRPCError3 } from "@trpc/server";
import { z as z2 } from "zod";
import { eq as eq2, and, gte, lte, isNull, inArray } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";
async function calculateBreakTimeMinutes(clockIn, clockOut, db) {
  if (!db) return 0;
  const breakTimes2 = await db.select().from(schema_exports.breakTimes).where(eq2(schema_exports.breakTimes.isActive, "true"));
  let totalBreakMinutes = 0;
  const clockInDate = new Date(clockIn);
  const clockOutDate = new Date(clockOut);
  const clockInDay = new Date(clockInDate.getFullYear(), clockInDate.getMonth(), clockInDate.getDate());
  const clockOutDay = new Date(clockOutDate.getFullYear(), clockOutDate.getMonth(), clockOutDate.getDate());
  const daysDiff = Math.floor((clockOutDay.getTime() - clockInDay.getTime()) / (1e3 * 60 * 60 * 24));
  for (const breakTime of breakTimes2) {
    const [breakStartHour, breakStartMinute] = breakTime.startTime.split(":").map(Number);
    const [breakEndHour, breakEndMinute] = breakTime.endTime.split(":").map(Number);
    for (let dayOffset = 0; dayOffset <= daysDiff; dayOffset++) {
      const checkDate = new Date(clockInDay);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      const breakStart = new Date(checkDate);
      breakStart.setHours(breakStartHour, breakStartMinute, 0, 0);
      const breakEnd = new Date(checkDate);
      breakEnd.setHours(breakEndHour, breakEndMinute, 0, 0);
      if (breakEnd < breakStart) {
        breakEnd.setDate(breakEnd.getDate() + 1);
      }
      const hasOverlap = clockInDate < breakEnd && clockOutDate > breakStart;
      if (hasOverlap) {
        const overlapStart = clockInDate > breakStart ? clockInDate : breakStart;
        const overlapEnd = clockOutDate < breakEnd ? clockOutDate : breakEnd;
        if (overlapStart < overlapEnd) {
          const overlapMinutes = Math.floor(
            (overlapEnd.getTime() - overlapStart.getTime()) / 1e3 / 60
          );
          if (overlapMinutes > 0) {
            totalBreakMinutes += overlapMinutes;
          }
        }
      }
    }
  }
  return totalBreakMinutes;
}
var attendanceRouter = createTRPCRouter({
  // 今日の出退勤状況を取得
  getTodayStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const today = /* @__PURE__ */ new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);
    const records = await db.select().from(schema_exports.attendanceRecords).where(
      and(
        eq2(schema_exports.attendanceRecords.userId, ctx.user.id),
        gte(schema_exports.attendanceRecords.clockIn, start),
        lte(schema_exports.attendanceRecords.clockIn, end)
      )
    ).limit(1);
    if (records.length === 0) {
      return null;
    }
    const record = records[0];
    let workDuration = record.workDuration;
    if (record.clockOut) {
      const totalMinutes = Math.floor(
        (record.clockOut.getTime() - record.clockIn.getTime()) / 1e3 / 60
      );
      const breakMinutes = await calculateBreakTimeMinutes(record.clockIn, record.clockOut, db);
      workDuration = Math.max(0, totalMinutes - breakMinutes);
    }
    return {
      id: record.id,
      clockIn: record.clockIn,
      clockOut: record.clockOut,
      workDuration
    };
  }),
  // 出勤打刻
  clockIn: protectedProcedure.input(
    z2.object({
      deviceType: z2.enum(["pc", "mobile"]).optional().default("pc")
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const today = /* @__PURE__ */ new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);
    const existing = await db.select().from(schema_exports.attendanceRecords).where(
      and(
        eq2(schema_exports.attendanceRecords.userId, ctx.user.id),
        gte(schema_exports.attendanceRecords.clockIn, start),
        lte(schema_exports.attendanceRecords.clockIn, end)
      )
    ).limit(1);
    if (existing.length > 0) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "\u4ECA\u65E5\u306F\u65E2\u306B\u51FA\u52E4\u3057\u3066\u3044\u307E\u3059"
      });
    }
    const result = await db.insert(schema_exports.attendanceRecords).values({
      userId: ctx.user.id,
      clockIn: /* @__PURE__ */ new Date(),
      clockInDevice: input.deviceType
    });
    const clockInTime = /* @__PURE__ */ new Date();
    const allRecords = await db.select().from(schema_exports.attendanceRecords).where(eq2(schema_exports.attendanceRecords.userId, ctx.user.id)).orderBy(schema_exports.attendanceRecords.clockIn);
    const inserted = allRecords[allRecords.length - 1];
    return {
      id: inserted.id,
      clockIn: inserted.clockIn
    };
  }),
  // 退勤打刻
  clockOut: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const records = await db.select().from(schema_exports.attendanceRecords).where(
      and(
        eq2(schema_exports.attendanceRecords.userId, ctx.user.id),
        isNull(schema_exports.attendanceRecords.clockOut)
      )
    ).orderBy(schema_exports.attendanceRecords.clockIn).limit(1);
    if (records.length === 0) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "\u51FA\u52E4\u8A18\u9332\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
      });
    }
    const record = records[0];
    const clockOut = /* @__PURE__ */ new Date();
    const totalMinutes = Math.floor((clockOut.getTime() - record.clockIn.getTime()) / 1e3 / 60);
    const breakMinutes = await calculateBreakTimeMinutes(record.clockIn, clockOut, db);
    const workDuration = Math.max(0, totalMinutes - breakMinutes);
    await db.update(schema_exports.attendanceRecords).set({
      clockOut,
      clockOutDevice: "pc",
      workDuration
    }).where(eq2(schema_exports.attendanceRecords.id, record.id));
    return {
      id: record.id,
      clockOut,
      workDuration
    };
  }),
  // 全スタッフの今日の出退勤状況を取得（管理者専用）
  getAllStaffToday: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const today = /* @__PURE__ */ new Date();
    const start = startOfDay(today);
    const end = endOfDay(today);
    const allUsers = await db.select().from(schema_exports.users);
    const result = await Promise.all(
      allUsers.map(async (user) => {
        const [attendance] = await db.select().from(schema_exports.attendanceRecords).where(
          and(
            eq2(schema_exports.attendanceRecords.userId, user.id),
            gte(schema_exports.attendanceRecords.clockIn, start),
            lte(schema_exports.attendanceRecords.clockIn, end)
          )
        ).limit(1);
        let workDuration = attendance?.workDuration || null;
        if (attendance && attendance.clockOut) {
          const totalMinutes = Math.floor(
            (attendance.clockOut.getTime() - attendance.clockIn.getTime()) / 1e3 / 60
          );
          const breakMinutes = await calculateBreakTimeMinutes(
            attendance.clockIn,
            attendance.clockOut,
            db
          );
          workDuration = Math.max(0, totalMinutes - breakMinutes);
        }
        return {
          userId: user.id,
          userName: user.name || user.username,
          attendance: attendance ? {
            id: attendance.id,
            clockIn: attendance.clockIn,
            clockOut: attendance.clockOut,
            workDuration,
            clockInDevice: attendance.clockInDevice,
            clockOutDevice: attendance.clockOutDevice
          } : null
        };
      })
    );
    return result;
  }),
  // 特定日の全スタッフの出退勤状況を取得（管理者専用）
  getAllStaffByDate: adminProcedure.input(z2.object({ date: z2.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const targetDate = /* @__PURE__ */ new Date(input.date + "T00:00:00+09:00");
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);
    const allUsers = await db.select().from(schema_exports.users);
    const result = await Promise.all(
      allUsers.map(async (user) => {
        const [attendance] = await db.select().from(schema_exports.attendanceRecords).where(
          and(
            eq2(schema_exports.attendanceRecords.userId, user.id),
            gte(schema_exports.attendanceRecords.clockIn, start),
            lte(schema_exports.attendanceRecords.clockIn, end)
          )
        ).orderBy(schema_exports.attendanceRecords.clockIn).limit(1);
        let workDuration = attendance?.workDuration || null;
        if (attendance && attendance.clockOut) {
          const totalMinutes = Math.floor(
            (attendance.clockOut.getTime() - attendance.clockIn.getTime()) / 1e3 / 60
          );
          const breakMinutes = await calculateBreakTimeMinutes(
            attendance.clockIn,
            attendance.clockOut,
            db
          );
          workDuration = Math.max(0, totalMinutes - breakMinutes);
        }
        return {
          userId: user.id,
          userName: user.name || user.username,
          attendance: attendance ? {
            id: attendance.id,
            clockIn: attendance.clockIn,
            clockOut: attendance.clockOut,
            workDuration,
            clockInDevice: attendance.clockInDevice,
            clockOutDevice: attendance.clockOutDevice
          } : null
        };
      })
    );
    return result;
  }),
  // 管理者が代理で出勤打刻（管理者専用）
  adminClockIn: adminProcedure.input(
    z2.object({
      userId: z2.number(),
      clockIn: z2.string(),
      deviceType: z2.enum(["pc", "mobile"]).optional().default("pc")
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const clockInTime = new Date(input.clockIn);
    const start = startOfDay(clockInTime);
    const end = endOfDay(clockInTime);
    const existing = await db.select().from(schema_exports.attendanceRecords).where(
      and(
        eq2(schema_exports.attendanceRecords.userId, input.userId),
        gte(schema_exports.attendanceRecords.clockIn, start),
        lte(schema_exports.attendanceRecords.clockIn, end)
      )
    ).limit(1);
    if (existing.length > 0) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "\u305D\u306E\u65E5\u306F\u65E2\u306B\u51FA\u52E4\u3057\u3066\u3044\u307E\u3059"
      });
    }
    await db.insert(schema_exports.attendanceRecords).values({
      userId: input.userId,
      clockIn: clockInTime,
      clockInDevice: input.deviceType
    });
    const [user] = await db.select().from(schema_exports.users).where(eq2(schema_exports.users.id, input.userId)).limit(1);
    return {
      id: input.userId,
      userName: user?.name || user?.username || "\u4E0D\u660E"
    };
  }),
  // 管理者が代理で退勤打刻（管理者専用）
  adminClockOut: adminProcedure.input(
    z2.object({
      userId: z2.number(),
      clockOut: z2.string()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const [record] = await db.select().from(schema_exports.attendanceRecords).where(
      and(
        eq2(schema_exports.attendanceRecords.userId, input.userId),
        isNull(schema_exports.attendanceRecords.clockOut)
      )
    ).orderBy(schema_exports.attendanceRecords.clockIn).limit(1);
    if (!record) {
      throw new TRPCError3({
        code: "BAD_REQUEST",
        message: "\u51FA\u52E4\u8A18\u9332\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
      });
    }
    const clockOutTime = new Date(input.clockOut);
    const totalMinutes = Math.floor(
      (clockOutTime.getTime() - record.clockIn.getTime()) / 1e3 / 60
    );
    const breakMinutes = await calculateBreakTimeMinutes(record.clockIn, clockOutTime, db);
    const workDuration = Math.max(0, totalMinutes - breakMinutes);
    await db.update(schema_exports.attendanceRecords).set({
      clockOut: clockOutTime,
      clockOutDevice: "pc",
      workDuration
    }).where(eq2(schema_exports.attendanceRecords.id, record.id));
    const [user] = await db.select().from(schema_exports.users).where(eq2(schema_exports.users.id, input.userId)).limit(1);
    return {
      id: input.userId,
      userName: user?.name || user?.username || "\u4E0D\u660E"
    };
  }),
  // 出退勤記録を更新（管理者専用）
  updateAttendance: adminProcedure.input(
    z2.object({
      attendanceId: z2.number(),
      clockIn: z2.string().optional(),
      clockOut: z2.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const [record] = await db.select().from(schema_exports.attendanceRecords).where(eq2(schema_exports.attendanceRecords.id, input.attendanceId)).limit(1);
    if (!record) {
      throw new TRPCError3({
        code: "NOT_FOUND",
        message: "\u51FA\u9000\u52E4\u8A18\u9332\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
      });
    }
    const updateData = {};
    if (input.clockIn) {
      updateData.clockIn = new Date(input.clockIn);
    }
    if (input.clockOut) {
      updateData.clockOut = new Date(input.clockOut);
    }
    if (input.clockIn || input.clockOut) {
      const clockIn = input.clockIn ? new Date(input.clockIn) : record.clockIn;
      const clockOut = input.clockOut ? new Date(input.clockOut) : record.clockOut;
      if (clockOut) {
        const totalMinutes = Math.floor(
          (clockOut.getTime() - clockIn.getTime()) / 1e3 / 60
        );
        const breakMinutes = await calculateBreakTimeMinutes(clockIn, clockOut, db);
        updateData.workDuration = Math.max(0, totalMinutes - breakMinutes);
      }
    }
    await db.update(schema_exports.attendanceRecords).set(updateData).where(eq2(schema_exports.attendanceRecords.id, input.attendanceId));
    if (input.clockIn) {
      await db.insert(schema_exports.attendanceEditLogs).values({
        attendanceId: input.attendanceId,
        editorId: ctx.user.id,
        fieldName: "clockIn",
        oldValue: record.clockIn,
        newValue: new Date(input.clockIn)
      });
    }
    if (input.clockOut) {
      await db.insert(schema_exports.attendanceEditLogs).values({
        attendanceId: input.attendanceId,
        editorId: ctx.user.id,
        fieldName: "clockOut",
        oldValue: record.clockOut,
        newValue: new Date(input.clockOut)
      });
    }
    return { success: true };
  }),
  // 出退勤記録を削除（管理者専用）
  deleteAttendance: adminProcedure.input(z2.object({ attendanceId: z2.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.delete(schema_exports.attendanceRecords).where(eq2(schema_exports.attendanceRecords.id, input.attendanceId));
    return { success: true };
  }),
  // 編集履歴を取得（管理者専用）
  getEditLogs: adminProcedure.input(
    z2.object({
      attendanceId: z2.number().optional(),
      startDate: z2.string().optional(),
      endDate: z2.string().optional()
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError3({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    let logs;
    if (input.attendanceId) {
      logs = await db.select().from(schema_exports.attendanceEditLogs).where(eq2(schema_exports.attendanceEditLogs.attendanceId, input.attendanceId)).orderBy(schema_exports.attendanceEditLogs.createdAt);
    } else {
      logs = await db.select().from(schema_exports.attendanceEditLogs).orderBy(schema_exports.attendanceEditLogs.createdAt);
    }
    const users2 = await db.select().from(schema_exports.users);
    const userMap = new Map(users2.map((u) => [u.id, u]));
    const attendanceIds = [...new Set(logs.map((log) => log.attendanceId))];
    let attendances = [];
    if (attendanceIds.length > 0) {
      attendances = await db.select().from(schema_exports.attendanceRecords).where(inArray(schema_exports.attendanceRecords.id, attendanceIds));
    }
    return logs.map((log) => {
      const editor = userMap.get(log.editorId);
      const attendance = attendances.find((a) => a.id === log.attendanceId);
      const attendanceUser = attendance ? userMap.get(attendance.userId) : null;
      return {
        id: log.id,
        attendanceId: log.attendanceId,
        editorId: log.editorId,
        editorName: editor?.name || editor?.username || "\u4E0D\u660E",
        editorUsername: editor?.username || "\u4E0D\u660E",
        userName: attendanceUser?.name || attendanceUser?.username || "\u4E0D\u660E",
        fieldName: log.fieldName,
        oldValue: log.oldValue,
        newValue: log.newValue,
        createdAt: log.createdAt
      };
    });
  })
});

// server/routers/workRecords.ts
import { TRPCError as TRPCError4 } from "@trpc/server";
import { z as z3 } from "zod";
import { eq as eq3, and as and2, isNull as isNull2, gte as gte2, lte as lte2 } from "drizzle-orm";
import { startOfDay as startOfDay2, endOfDay as endOfDay2 } from "date-fns";
var workRecordsRouter = createTRPCRouter({
  // 作業中の記録を取得
  getActive: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const records = await db.select({
      id: schema_exports.workRecords.id,
      vehicleId: schema_exports.workRecords.vehicleId,
      processId: schema_exports.workRecords.processId,
      startTime: schema_exports.workRecords.startTime
    }).from(schema_exports.workRecords).where(
      and2(
        eq3(schema_exports.workRecords.userId, ctx.user.id),
        isNull2(schema_exports.workRecords.endTime)
      )
    );
    return records.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      vehicleNumber: "\u672A\u53D6\u5F97",
      vehicleType: "\u672A\u53D6\u5F97",
      processId: r.processId,
      processName: "\u672A\u53D6\u5F97",
      startTime: r.startTime
    }));
  }),
  // 今日の作業記録を取得
  getTodayRecords: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const today = /* @__PURE__ */ new Date();
    const start = startOfDay2(today);
    const end = endOfDay2(today);
    const records = await db.select().from(schema_exports.workRecords).where(
      and2(
        eq3(schema_exports.workRecords.userId, ctx.user.id),
        gte2(schema_exports.workRecords.startTime, start),
        lte2(schema_exports.workRecords.startTime, end)
      )
    ).orderBy(schema_exports.workRecords.startTime);
    return records.map((r) => ({
      id: r.id,
      vehicleId: r.vehicleId,
      vehicleNumber: "\u672A\u53D6\u5F97",
      processId: r.processId,
      processName: "\u672A\u53D6\u5F97",
      startTime: r.startTime,
      endTime: r.endTime,
      durationMinutes: r.endTime ? Math.floor((r.endTime.getTime() - r.startTime.getTime()) / 1e3 / 60) : null
    }));
  }),
  // 作業記録を作成
  create: protectedProcedure.input(
    z3.object({
      userId: z3.number(),
      vehicleId: z3.number(),
      processId: z3.number(),
      startTime: z3.string(),
      endTime: z3.string().optional(),
      workDescription: z3.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    if (input.userId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new TRPCError4({
        code: "FORBIDDEN",
        message: "\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093"
      });
    }
    const [result] = await db.insert(schema_exports.workRecords).values({
      userId: input.userId,
      vehicleId: input.vehicleId,
      processId: input.processId,
      startTime: new Date(input.startTime),
      endTime: input.endTime ? new Date(input.endTime) : null,
      workDescription: input.workDescription
    });
    return {
      id: result.insertId
    };
  }),
  // 全スタッフの作業記録を取得（管理者専用）
  getAllRecords: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const records = await db.select().from(schema_exports.workRecords).orderBy(schema_exports.workRecords.startTime);
    const users2 = await db.select().from(schema_exports.users);
    const vehicles2 = await db.select().from(schema_exports.vehicles);
    const processes2 = await db.select().from(schema_exports.processes);
    const userMap = new Map(users2.map((u) => [u.id, u]));
    const vehicleMap = new Map(vehicles2.map((v) => [v.id, v]));
    const processMap = new Map(processes2.map((p) => [p.id, p]));
    return records.map((r) => {
      const user = userMap.get(r.userId);
      const vehicle = vehicleMap.get(r.vehicleId);
      const process2 = processMap.get(r.processId);
      return {
        id: r.id,
        userId: r.userId,
        userName: user?.name || user?.username || "\u4E0D\u660E",
        vehicleId: r.vehicleId,
        vehicleNumber: vehicle?.vehicleNumber || "\u4E0D\u660E",
        processId: r.processId,
        processName: process2?.name || "\u4E0D\u660E",
        startTime: r.startTime,
        endTime: r.endTime,
        durationMinutes: r.endTime ? Math.floor((r.endTime.getTime() - r.startTime.getTime()) / 1e3 / 60) : null,
        workDescription: r.workDescription
      };
    });
  }),
  // 作業記録を更新（管理者専用）
  update: adminProcedure.input(
    z3.object({
      id: z3.number(),
      vehicleId: z3.number().optional(),
      processId: z3.number().optional(),
      startTime: z3.string().optional(),
      endTime: z3.string().optional(),
      workDescription: z3.string().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const updateData = {};
    if (input.vehicleId !== void 0) updateData.vehicleId = input.vehicleId;
    if (input.processId !== void 0) updateData.processId = input.processId;
    if (input.startTime !== void 0) updateData.startTime = new Date(input.startTime);
    if (input.endTime !== void 0) updateData.endTime = input.endTime ? new Date(input.endTime) : null;
    if (input.workDescription !== void 0) updateData.workDescription = input.workDescription;
    await db.update(schema_exports.workRecords).set(updateData).where(eq3(schema_exports.workRecords.id, input.id));
    return { success: true };
  }),
  // 作業記録を削除（管理者専用）
  delete: adminProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.delete(schema_exports.workRecords).where(eq3(schema_exports.workRecords.id, input.id));
    return { success: true };
  }),
  // 作業を開始
  start: protectedProcedure.input(
    z3.object({
      vehicleId: z3.number(),
      processId: z3.number(),
      workDescription: z3.string().optional()
    })
  ).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const activeRecords = await db.select().from(schema_exports.workRecords).where(
      and2(
        eq3(schema_exports.workRecords.userId, ctx.user.id),
        isNull2(schema_exports.workRecords.endTime)
      )
    );
    if (activeRecords.length > 0) {
      throw new TRPCError4({
        code: "BAD_REQUEST",
        message: "\u65E2\u306B\u4F5C\u696D\u4E2D\u306E\u8A18\u9332\u304C\u3042\u308A\u307E\u3059\u3002\u5148\u306B\u4F5C\u696D\u3092\u7D42\u4E86\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
      });
    }
    const [result] = await db.insert(schema_exports.workRecords).values({
      userId: ctx.user.id,
      vehicleId: input.vehicleId,
      processId: input.processId,
      startTime: /* @__PURE__ */ new Date(),
      endTime: null,
      workDescription: input.workDescription
    });
    const [inserted] = await db.select().from(schema_exports.workRecords).where(eq3(schema_exports.workRecords.id, result.insertId)).limit(1);
    return {
      id: inserted.id,
      startTime: inserted.startTime
    };
  }),
  // 作業を終了
  stop: protectedProcedure.input(z3.object({ id: z3.number() })).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError4({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const [record] = await db.select().from(schema_exports.workRecords).where(eq3(schema_exports.workRecords.id, input.id)).limit(1);
    if (!record) {
      throw new TRPCError4({
        code: "NOT_FOUND",
        message: "\u4F5C\u696D\u8A18\u9332\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
      });
    }
    if (record.userId !== ctx.user.id && ctx.user.role !== "admin") {
      throw new TRPCError4({
        code: "FORBIDDEN",
        message: "\u6A29\u9650\u304C\u3042\u308A\u307E\u305B\u3093"
      });
    }
    const endTime = /* @__PURE__ */ new Date();
    const durationMinutes = Math.floor(
      (endTime.getTime() - record.startTime.getTime()) / 1e3 / 60
    );
    await db.update(schema_exports.workRecords).set({
      endTime
    }).where(eq3(schema_exports.workRecords.id, input.id));
    return {
      id: input.id,
      endTime,
      durationMinutes
    };
  })
});

// server/routers/vehicles.ts
import { TRPCError as TRPCError5 } from "@trpc/server";
import { z as z4 } from "zod";
import { eq as eq4 } from "drizzle-orm";
var vehiclesRouter = createTRPCRouter({
  // 車両一覧を取得
  list: protectedProcedure.input(
    z4.object({
      status: z4.enum(["in_progress", "completed", "archived"]).optional(),
      sinceYesterday: z4.boolean().optional().default(false)
    })
  ).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    let vehicles2;
    if (input.status) {
      vehicles2 = await db.select().from(schema_exports.vehicles).where(eq4(schema_exports.vehicles.status, input.status));
    } else {
      vehicles2 = await db.select().from(schema_exports.vehicles);
    }
    return vehicles2.map((v) => ({
      id: v.id,
      vehicleNumber: v.vehicleNumber,
      vehicleTypeId: v.vehicleTypeId,
      customerName: v.customerName,
      desiredDeliveryDate: v.desiredDeliveryDate,
      completionDate: v.completionDate,
      status: v.status,
      targetTotalMinutes: v.targetTotalMinutes,
      processTime: [],
      processTargets: []
    }));
  }),
  // 車両を作成（管理者専用）
  create: adminProcedure.input(
    z4.object({
      vehicleNumber: z4.string(),
      vehicleTypeId: z4.number(),
      customerName: z4.string().optional(),
      desiredDeliveryDate: z4.date().optional(),
      targetTotalMinutes: z4.number().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.insert(schema_exports.vehicles).values({
      vehicleNumber: input.vehicleNumber,
      vehicleTypeId: input.vehicleTypeId,
      customerName: input.customerName,
      desiredDeliveryDate: input.desiredDeliveryDate,
      targetTotalMinutes: input.targetTotalMinutes
    });
    const [inserted] = await db.select().from(schema_exports.vehicles).where(eq4(schema_exports.vehicles.vehicleNumber, input.vehicleNumber)).limit(1);
    return {
      id: inserted.id
    };
  }),
  // 車両を更新（管理者専用）
  update: adminProcedure.input(
    z4.object({
      id: z4.number(),
      vehicleNumber: z4.string().optional(),
      vehicleTypeId: z4.number().optional(),
      customerName: z4.string().optional(),
      desiredDeliveryDate: z4.date().optional(),
      targetTotalMinutes: z4.number().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const updateData = {};
    if (input.vehicleNumber !== void 0) updateData.vehicleNumber = input.vehicleNumber;
    if (input.vehicleTypeId !== void 0) updateData.vehicleTypeId = input.vehicleTypeId;
    if (input.customerName !== void 0) updateData.customerName = input.customerName;
    if (input.desiredDeliveryDate !== void 0)
      updateData.desiredDeliveryDate = input.desiredDeliveryDate;
    if (input.targetTotalMinutes !== void 0)
      updateData.targetTotalMinutes = input.targetTotalMinutes;
    await db.update(schema_exports.vehicles).set(updateData).where(eq4(schema_exports.vehicles.id, input.id));
    return { success: true };
  }),
  // 車両詳細を取得
  get: protectedProcedure.input(z4.object({ id: z4.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const [vehicle] = await db.select().from(schema_exports.vehicles).where(eq4(schema_exports.vehicles.id, input.id)).limit(1);
    if (!vehicle) {
      throw new TRPCError5({
        code: "NOT_FOUND",
        message: "\u8ECA\u4E21\u304C\u898B\u3064\u304B\u308A\u307E\u305B\u3093"
      });
    }
    const workRecords2 = await db.select().from(schema_exports.workRecords).where(eq4(schema_exports.workRecords.vehicleId, input.id)).orderBy(schema_exports.workRecords.startTime);
    const users2 = await db.select().from(schema_exports.users);
    const processes2 = await db.select().from(schema_exports.processes);
    const userMap = new Map(users2.map((u) => [u.id, u]));
    const processMap = new Map(processes2.map((p) => [p.id, p]));
    const memos = await db.select().from(schema_exports.vehicleMemos).where(eq4(schema_exports.vehicleMemos.vehicleId, input.id)).orderBy(schema_exports.vehicleMemos.createdAt);
    const processTimeMap = /* @__PURE__ */ new Map();
    workRecords2.forEach((wr) => {
      if (wr.endTime) {
        const minutes = Math.floor(
          (wr.endTime.getTime() - wr.startTime.getTime()) / 1e3 / 60
        );
        const current = processTimeMap.get(wr.processId) || 0;
        processTimeMap.set(wr.processId, current + minutes);
      }
    });
    const processTime = Array.from(processTimeMap.entries()).map(([processId, minutes]) => ({
      processId,
      processName: processMap.get(processId)?.name || "\u4E0D\u660E",
      minutes
    }));
    return {
      ...vehicle,
      workRecords: workRecords2.map((wr) => ({
        id: wr.id,
        userId: wr.userId,
        userName: userMap.get(wr.userId)?.name || userMap.get(wr.userId)?.username || "\u4E0D\u660E",
        processId: wr.processId,
        processName: processMap.get(wr.processId)?.name || "\u4E0D\u660E",
        startTime: wr.startTime,
        endTime: wr.endTime,
        durationMinutes: wr.endTime ? Math.floor((wr.endTime.getTime() - wr.startTime.getTime()) / 1e3 / 60) : null,
        workDescription: wr.workDescription
      })),
      memos: memos.map((m) => ({
        id: m.id,
        userId: m.userId,
        userName: userMap.get(m.userId)?.name || userMap.get(m.userId)?.username || "\u4E0D\u660E",
        content: m.content,
        createdAt: m.createdAt
      })),
      processTime
    };
  }),
  // 車両を削除（管理者専用）
  delete: adminProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.delete(schema_exports.vehicles).where(eq4(schema_exports.vehicles.id, input.id));
    return { success: true };
  }),
  // 車両を完成にする（管理者専用）
  complete: adminProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.update(schema_exports.vehicles).set({
      status: "completed",
      completionDate: /* @__PURE__ */ new Date()
    }).where(eq4(schema_exports.vehicles.id, input.id));
    return { success: true };
  }),
  // 車両を保管する（管理者専用）
  archive: adminProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.update(schema_exports.vehicles).set({
      status: "archived"
    }).where(eq4(schema_exports.vehicles.id, input.id));
    return { success: true };
  }),
  // 車両を作業中に戻す（管理者専用）
  uncomplete: adminProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.update(schema_exports.vehicles).set({
      status: "in_progress",
      completionDate: null
    }).where(eq4(schema_exports.vehicles.id, input.id));
    return { success: true };
  }),
  // 車両を完成に戻す（管理者専用）
  unarchive: adminProcedure.input(z4.object({ id: z4.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError5({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.update(schema_exports.vehicles).set({
      status: "completed"
    }).where(eq4(schema_exports.vehicles.id, input.id));
    return { success: true };
  })
});

// server/routers/processes.ts
import { TRPCError as TRPCError6 } from "@trpc/server";
import { z as z5 } from "zod";
import { eq as eq5 } from "drizzle-orm";
var processesRouter = createTRPCRouter({
  // 工程一覧を取得
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const processes2 = await db.select().from(schema_exports.processes).orderBy(schema_exports.processes.displayOrder);
    return processes2;
  }),
  // 工程を作成（管理者専用）
  create: adminProcedure.input(
    z5.object({
      name: z5.string(),
      description: z5.string().optional(),
      majorCategory: z5.string().optional(),
      minorCategory: z5.string().optional(),
      displayOrder: z5.number().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError6({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.insert(schema_exports.processes).values({
      name: input.name,
      description: input.description,
      majorCategory: input.majorCategory,
      minorCategory: input.minorCategory,
      displayOrder: input.displayOrder || 0
    });
    return { success: true };
  }),
  // 工程を更新（管理者専用）
  update: adminProcedure.input(
    z5.object({
      id: z5.number(),
      name: z5.string().optional(),
      description: z5.string().optional(),
      majorCategory: z5.string().optional(),
      minorCategory: z5.string().optional(),
      displayOrder: z5.number().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError6({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const updateData = {};
    if (input.name !== void 0) updateData.name = input.name;
    if (input.description !== void 0) updateData.description = input.description;
    if (input.majorCategory !== void 0) updateData.majorCategory = input.majorCategory;
    if (input.minorCategory !== void 0) updateData.minorCategory = input.minorCategory;
    if (input.displayOrder !== void 0) updateData.displayOrder = input.displayOrder;
    await db.update(schema_exports.processes).set(updateData).where(eq5(schema_exports.processes.id, input.id));
    return { success: true };
  }),
  // 工程を削除（管理者専用）
  delete: adminProcedure.input(z5.object({ id: z5.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError6({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.delete(schema_exports.processes).where(eq5(schema_exports.processes.id, input.id));
    return { success: true };
  })
});

// server/routers/vehicleTypes.ts
import { TRPCError as TRPCError7 } from "@trpc/server";
import { z as z6 } from "zod";
import { eq as eq6 } from "drizzle-orm";
var vehicleTypesRouter = createTRPCRouter({
  // 車種一覧を取得
  list: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const vehicleTypes2 = await db.select().from(schema_exports.vehicleTypes);
    return vehicleTypes2;
  }),
  // 車種を作成（管理者専用）
  create: adminProcedure.input(
    z6.object({
      name: z6.string(),
      description: z6.string().optional(),
      standardTotalMinutes: z6.number().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError7({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.insert(schema_exports.vehicleTypes).values({
      name: input.name,
      description: input.description,
      standardTotalMinutes: input.standardTotalMinutes
    });
    return { success: true };
  }),
  // 車種を更新（管理者専用）
  update: adminProcedure.input(
    z6.object({
      id: z6.number(),
      name: z6.string().optional(),
      description: z6.string().optional(),
      standardTotalMinutes: z6.number().optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError7({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const updateData = {};
    if (input.name !== void 0) updateData.name = input.name;
    if (input.description !== void 0) updateData.description = input.description;
    if (input.standardTotalMinutes !== void 0)
      updateData.standardTotalMinutes = input.standardTotalMinutes;
    await db.update(schema_exports.vehicleTypes).set(updateData).where(eq6(schema_exports.vehicleTypes.id, input.id));
    return { success: true };
  }),
  // 車種を削除（管理者専用）
  delete: adminProcedure.input(z6.object({ id: z6.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError7({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.delete(schema_exports.vehicleTypes).where(eq6(schema_exports.vehicleTypes.id, input.id));
    return { success: true };
  })
});

// server/routers/users.ts
import { TRPCError as TRPCError8 } from "@trpc/server";
import { z as z7 } from "zod";
import bcrypt2 from "bcryptjs";
import { eq as eq7 } from "drizzle-orm";
var usersRouter = createTRPCRouter({
  // 全ユーザー一覧を取得（管理者専用）
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const users2 = await db.select({
      id: schema_exports.users.id,
      username: schema_exports.users.username,
      name: schema_exports.users.name,
      role: schema_exports.users.role,
      createdAt: schema_exports.users.createdAt
    }).from(schema_exports.users).orderBy(schema_exports.users.id);
    return users2;
  }),
  // ユーザーを作成（管理者専用）
  create: adminProcedure.input(
    z7.object({
      username: z7.string(),
      password: z7.string(),
      name: z7.string().optional(),
      role: z7.enum(["user", "admin"]).default("user")
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError8({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const existing = await db.select().from(schema_exports.users).where(eq7(schema_exports.users.username, input.username)).limit(1);
    if (existing.length > 0) {
      throw new TRPCError8({
        code: "BAD_REQUEST",
        message: "\u3053\u306E\u30E6\u30FC\u30B6\u30FC\u540D\u306F\u65E2\u306B\u4F7F\u7528\u3055\u308C\u3066\u3044\u307E\u3059"
      });
    }
    const hashedPassword = await bcrypt2.hash(input.password, 10);
    await db.insert(schema_exports.users).values({
      username: input.username,
      password: hashedPassword,
      name: input.name,
      role: input.role
    });
    return { success: true };
  }),
  // ユーザーを更新（管理者専用）
  update: adminProcedure.input(
    z7.object({
      id: z7.number(),
      username: z7.string().optional(),
      password: z7.string().optional(),
      name: z7.string().optional(),
      role: z7.enum(["user", "admin"]).optional()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError8({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    const updateData = {};
    if (input.username !== void 0) updateData.username = input.username;
    if (input.password !== void 0) {
      updateData.password = await bcrypt2.hash(input.password, 10);
    }
    if (input.name !== void 0) updateData.name = input.name;
    if (input.role !== void 0) updateData.role = input.role;
    await db.update(schema_exports.users).set(updateData).where(eq7(schema_exports.users.id, input.id));
    return { success: true };
  }),
  // ユーザーを削除（管理者専用）
  delete: adminProcedure.input(z7.object({ id: z7.number() })).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError8({
        code: "INTERNAL_SERVER_ERROR",
        message: "\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093"
      });
    }
    await db.delete(schema_exports.users).where(eq7(schema_exports.users.id, input.id));
    return { success: true };
  })
});

// server/routers/analytics.ts
import { eq as eq8, sql } from "drizzle-orm";
var analyticsRouter = createTRPCRouter({
  getVehicleTypeStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const stats = await db.select({
      vehicleTypeId: schema_exports.vehicles.vehicleTypeId,
      vehicleCount: sql`COUNT(DISTINCT ${schema_exports.vehicles.id})`.as("vehicleCount"),
      totalMinutes: sql`COALESCE(SUM(TIMESTAMPDIFF(MINUTE, ${schema_exports.workRecords.startTime}, ${schema_exports.workRecords.endTime})), 0)`.as("totalMinutes")
    }).from(schema_exports.vehicles).leftJoin(schema_exports.workRecords, eq8(schema_exports.vehicles.id, schema_exports.workRecords.vehicleId)).where(sql`${schema_exports.workRecords.endTime} IS NOT NULL`).groupBy(schema_exports.vehicles.vehicleTypeId);
    const vehicleTypes2 = await db.select().from(schema_exports.vehicleTypes);
    const vehicleTypeMap = new Map(vehicleTypes2.map((vt) => [vt.id, vt.name]));
    return stats.map((stat) => {
      const vehicleCount = Number(stat.vehicleCount) || 0;
      const totalMinutes = Number(stat.totalMinutes) || 0;
      const averageMinutes = vehicleCount > 0 ? Math.round(totalMinutes / vehicleCount) : 0;
      return {
        vehicleTypeId: stat.vehicleTypeId,
        vehicleTypeName: vehicleTypeMap.get(stat.vehicleTypeId) || "\u4E0D\u660E",
        vehicleCount,
        totalMinutes,
        averageMinutes
      };
    });
  }),
  getProcessStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const stats = await db.select({
      processId: schema_exports.workRecords.processId,
      workCount: sql`COUNT(*)`.as("workCount"),
      totalMinutes: sql`COALESCE(SUM(TIMESTAMPDIFF(MINUTE, ${schema_exports.workRecords.startTime}, ${schema_exports.workRecords.endTime})), 0)`.as("totalMinutes")
    }).from(schema_exports.workRecords).where(sql`${schema_exports.workRecords.endTime} IS NOT NULL`).groupBy(schema_exports.workRecords.processId);
    const processes2 = await db.select().from(schema_exports.processes);
    const processMap = new Map(processes2.map((p) => [p.id, p.name]));
    return stats.map((stat) => {
      const workCount = Number(stat.workCount) || 0;
      const totalMinutes = Number(stat.totalMinutes) || 0;
      const averageMinutes = workCount > 0 ? Math.round(totalMinutes / workCount) : 0;
      return {
        processId: stat.processId,
        processName: processMap.get(stat.processId) || "\u4E0D\u660E",
        workCount,
        totalMinutes,
        averageMinutes
      };
    });
  }),
  getVehicleTypeProcessStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return [];
    }
    const stats = await db.select({
      vehicleTypeId: schema_exports.vehicles.vehicleTypeId,
      processId: schema_exports.workRecords.processId,
      workCount: sql`COUNT(*)`.as("workCount"),
      totalMinutes: sql`COALESCE(SUM(TIMESTAMPDIFF(MINUTE, ${schema_exports.workRecords.startTime}, ${schema_exports.workRecords.endTime})), 0)`.as("totalMinutes")
    }).from(schema_exports.workRecords).innerJoin(schema_exports.vehicles, eq8(schema_exports.workRecords.vehicleId, schema_exports.vehicles.id)).where(sql`${schema_exports.workRecords.endTime} IS NOT NULL`).groupBy(schema_exports.vehicles.vehicleTypeId, schema_exports.workRecords.processId);
    const vehicleTypes2 = await db.select().from(schema_exports.vehicleTypes);
    const processes2 = await db.select().from(schema_exports.processes);
    const vehicleTypeMap = new Map(vehicleTypes2.map((vt) => [vt.id, vt.name]));
    const processMap = new Map(processes2.map((p) => [p.id, p.name]));
    const standards = await db.select().from(schema_exports.vehicleTypeProcessStandards);
    const standardMap = new Map(
      standards.map((s) => [`${s.vehicleTypeId}-${s.processId}`, s.standardMinutes])
    );
    return stats.map((stat) => {
      const workCount = Number(stat.workCount) || 0;
      const totalMinutes = Number(stat.totalMinutes) || 0;
      const averageMinutes = workCount > 0 ? Math.round(totalMinutes / workCount) : 0;
      const standardMinutes = standardMap.get(`${stat.vehicleTypeId}-${stat.processId}`) || null;
      return {
        vehicleTypeId: stat.vehicleTypeId,
        vehicleTypeName: vehicleTypeMap.get(stat.vehicleTypeId) || "\u4E0D\u660E",
        processId: stat.processId,
        processName: processMap.get(stat.processId) || "\u4E0D\u660E",
        workCount,
        totalMinutes,
        averageMinutes,
        standardMinutes
      };
    });
  })
});

// server/routers/csv.ts
import { gte as gte3, lte as lte3, and as and3 } from "drizzle-orm";
import { startOfDay as startOfDay3, endOfDay as endOfDay3 } from "date-fns";
import { z as z8 } from "zod";
var csvRouter = createTRPCRouter({
  exportAttendance: adminProcedure.input(
    z8.object({
      startDate: z8.string(),
      endDate: z8.string()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093");
    }
    const start = startOfDay3(new Date(input.startDate));
    const end = endOfDay3(new Date(input.endDate));
    const records = await db.select().from(schema_exports.attendanceRecords).where(
      and3(gte3(schema_exports.attendanceRecords.clockIn, start), lte3(schema_exports.attendanceRecords.clockIn, end))
    );
    const users2 = await db.select().from(schema_exports.users);
    const userMap = new Map(users2.map((u) => [u.id, u]));
    const csvRows = [
      ["\u30E6\u30FC\u30B6\u30FC\u540D", "\u51FA\u52E4\u65E5", "\u51FA\u52E4\u6642\u523B", "\u9000\u52E4\u6642\u523B", "\u52E4\u52D9\u6642\u9593\uFF08\u5206\uFF09", "\u51FA\u52E4\u30C7\u30D0\u30A4\u30B9", "\u9000\u52E4\u30C7\u30D0\u30A4\u30B9"]
    ];
    const recordsByUser = /* @__PURE__ */ new Map();
    records.forEach((record) => {
      if (!recordsByUser.has(record.userId)) {
        recordsByUser.set(record.userId, []);
      }
      recordsByUser.get(record.userId).push(record);
    });
    const sortedUserIds = Array.from(recordsByUser.keys()).sort();
    sortedUserIds.forEach((userId) => {
      const userRecords = recordsByUser.get(userId);
      userRecords.sort((a, b) => {
        const dateA = new Date(a.clockIn).getTime();
        const dateB = new Date(b.clockIn).getTime();
        return dateA - dateB;
      });
      userRecords.forEach((record) => {
        const user = userMap.get(record.userId);
        const userName = user?.name || user?.username || "\u4E0D\u660E";
        const clockInDate = new Date(record.clockIn);
        const clockOutDate = record.clockOut ? new Date(record.clockOut) : null;
        csvRows.push([
          userName,
          clockInDate.toISOString().split("T")[0],
          clockInDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
          clockOutDate ? clockOutDate.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }) : "",
          record.workDuration?.toString() || "",
          record.clockInDevice || "",
          record.clockOutDevice || ""
        ]);
      });
    });
    const csv = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    return { csv };
  }),
  exportWorkRecords: adminProcedure.input(
    z8.object({
      startDate: z8.string(),
      endDate: z8.string()
    })
  ).mutation(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error("\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093");
    }
    const start = startOfDay3(new Date(input.startDate));
    const end = endOfDay3(new Date(input.endDate));
    const records = await db.select().from(schema_exports.workRecords).where(
      and3(gte3(schema_exports.workRecords.startTime, start), lte3(schema_exports.workRecords.startTime, end))
    );
    const users2 = await db.select().from(schema_exports.users);
    const vehicles2 = await db.select().from(schema_exports.vehicles);
    const processes2 = await db.select().from(schema_exports.processes);
    const vehicleTypes2 = await db.select().from(schema_exports.vehicleTypes);
    const userMap = new Map(users2.map((u) => [u.id, u]));
    const vehicleMap = new Map(vehicles2.map((v) => [v.id, v]));
    const processMap = new Map(processes2.map((p) => [p.id, p]));
    const vehicleTypeMap = new Map(vehicleTypes2.map((vt) => [vt.id, vt]));
    const csvRows = [
      ["\u30E6\u30FC\u30B6\u30FC\u540D", "\u8ECA\u4E21\u756A\u53F7", "\u8ECA\u7A2E", "\u5DE5\u7A0B", "\u958B\u59CB\u6642\u523B", "\u7D42\u4E86\u6642\u523B", "\u4F5C\u696D\u6642\u9593\uFF08\u5206\uFF09", "\u4F5C\u696D\u5185\u5BB9"]
    ];
    const recordsByUser = /* @__PURE__ */ new Map();
    records.forEach((record) => {
      if (!recordsByUser.has(record.userId)) {
        recordsByUser.set(record.userId, []);
      }
      recordsByUser.get(record.userId).push(record);
    });
    const sortedUserIds = Array.from(recordsByUser.keys()).sort();
    sortedUserIds.forEach((userId) => {
      const userRecords = recordsByUser.get(userId);
      userRecords.sort((a, b) => {
        const dateA = new Date(a.startTime).getTime();
        const dateB = new Date(b.startTime).getTime();
        return dateA - dateB;
      });
      userRecords.forEach((record) => {
        const user = userMap.get(record.userId);
        const vehicle = vehicleMap.get(record.vehicleId);
        const process2 = processMap.get(record.processId);
        const vehicleType = vehicle ? vehicleTypeMap.get(vehicle.vehicleTypeId) : null;
        const startTime = new Date(record.startTime);
        const endTime = record.endTime ? new Date(record.endTime) : null;
        const durationMinutes = endTime ? Math.floor((endTime.getTime() - startTime.getTime()) / 1e3 / 60) : null;
        csvRows.push([
          user?.name || user?.username || "\u4E0D\u660E",
          vehicle?.vehicleNumber || "\u4E0D\u660E",
          vehicleType?.name || "\u4E0D\u660E",
          process2?.name || "\u4E0D\u660E",
          startTime.toISOString().replace("T", " ").substring(0, 16),
          endTime ? endTime.toISOString().replace("T", " ").substring(0, 16) : "",
          durationMinutes?.toString() || "",
          record.workDescription || ""
        ]);
      });
    });
    const csv = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    return { csv };
  }),
  exportVehicles: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error("\u30C7\u30FC\u30BF\u30D9\u30FC\u30B9\u306B\u63A5\u7D9A\u3067\u304D\u307E\u305B\u3093");
    }
    const vehicles2 = await db.select().from(schema_exports.vehicles);
    const vehicleTypes2 = await db.select().from(schema_exports.vehicleTypes);
    const vehicleTypeMap = new Map(vehicleTypes2.map((vt) => [vt.id, vt]));
    const csvRows = [
      ["\u8ECA\u4E21\u756A\u53F7", "\u8ECA\u7A2E", "\u304A\u5BA2\u69D8\u540D", "\u5E0C\u671B\u7D0D\u671F", "\u5B8C\u6210\u65E5", "\u30B9\u30C6\u30FC\u30BF\u30B9", "\u76EE\u6A19\u5408\u8A08\u6642\u9593\uFF08\u5206\uFF09"]
    ];
    vehicles2.forEach((vehicle) => {
      const vehicleType = vehicleTypeMap.get(vehicle.vehicleTypeId);
      csvRows.push([
        vehicle.vehicleNumber,
        vehicleType?.name || "\u4E0D\u660E",
        vehicle.customerName || "",
        vehicle.desiredDeliveryDate ? new Date(vehicle.desiredDeliveryDate).toISOString().split("T")[0] : "",
        vehicle.completionDate ? new Date(vehicle.completionDate).toISOString().split("T")[0] : "",
        vehicle.status,
        vehicle.targetTotalMinutes?.toString() || ""
      ]);
    });
    const csv = csvRows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    return { csv };
  })
});

// server/routers.ts
var appRouter = createTRPCRouter({
  auth: authRouter,
  attendance: attendanceRouter,
  workRecords: workRecordsRouter,
  vehicles: vehiclesRouter,
  processes: processesRouter,
  vehicleTypes: vehicleTypesRouter,
  users: usersRouter,
  analytics: analyticsRouter,
  csv: csvRouter
});

// server/_core/context.ts
async function createContext({ req, res }) {
  const userIdStr = await getUserIdFromCookie(req);
  let user = null;
  if (userIdStr) {
    const userId = parseInt(userIdStr);
    if (!isNaN(userId)) {
      user = await getUserById(userId);
    }
  }
  return {
    req,
    res,
    userId: user?.id,
    user,
    isAdmin: user?.role === "admin" || user?.username === ENV.ownerOpenId
  };
}

// server/_core/vite.ts
import express from "express";
import fs from "fs";
import { nanoid } from "nanoid";
import path2 from "path";
import { createServer as createViteServer } from "vite";

// vite.config.ts
import { jsxLocPlugin } from "@builder.io/vite-plugin-jsx-loc";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { vitePluginManusRuntime } from "vite-plugin-manus-runtime";
var plugins = [react(), tailwindcss(), jsxLocPlugin(), vitePluginManusRuntime()];
var vite_config_default = defineConfig({
  plugins,
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets")
    }
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true
  },
  server: {
    port: 8e3,
    host: true,
    allowedHosts: [
      ".manuspre.computer",
      ".manus.computer",
      ".manus-asia.computer",
      ".manuscomputer.ai",
      ".manusvm.computer",
      "localhost",
      "127.0.0.1"
    ],
    hmr: {
      protocol: "wss",
      clientPort: 443
    },
    fs: {
      strict: true,
      deny: ["**/.*"]
    }
  }
});

// server/_core/vite.ts
async function setupVite(app, server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true
  };
  const vite = await createViteServer({
    ...vite_config_default,
    configFile: false,
    server: serverOptions,
    appType: "custom"
  });
  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path2.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });
}
function serveStatic(app) {
  const distPath = path2.resolve(import.meta.dirname, "public");
  console.log(`Serving static files from: ${distPath}`);
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
    return;
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path2.resolve(distPath, "index.html"));
  });
}

// server/init-data.ts
import bcrypt3 from "bcryptjs";
async function initializeInitialData() {
  const db = await getDb();
  if (!db) {
    console.warn("[Init] Database not available, skipping initialization");
    return;
  }
  try {
    await initializeUsers(db);
    await initializeProcesses(db);
    console.log("[Init] Initial data initialized successfully");
  } catch (error) {
    console.error("[Init] Failed to initialize initial data:", error);
  }
}
async function initializeUsers(db) {
  try {
    const existingUsers = await db.select().from(schema_exports.users).limit(1);
    if (existingUsers.length > 0) {
      console.log("[Init] Users already exist, skipping user initialization");
      return;
    }
  } catch (error) {
    console.warn("[Init] Failed to check existing users:", error);
    return;
  }
  const adminPassword = await bcrypt3.hash("admin123", 10);
  await db.insert(schema_exports.users).values({
    username: "admin",
    password: adminPassword,
    name: "\u7BA1\u7406\u8005",
    role: "admin"
  });
  const staffPassword = await bcrypt3.hash("password", 10);
  const staffUsers = [];
  for (let i = 1; i <= 40; i++) {
    const username = `user${String(i).padStart(3, "0")}`;
    staffUsers.push({
      username,
      password: staffPassword,
      name: `\u30B9\u30BF\u30C3\u30D5${i}`,
      role: "user"
    });
  }
  for (let i = 0; i < staffUsers.length; i += 1e3) {
    const batch = staffUsers.slice(i, i + 1e3);
    await db.insert(schema_exports.users).values(batch);
  }
  console.log("[Init] Created admin account (admin/admin123) and 40 staff accounts (user001-user040/password)");
}
async function initializeProcesses(db) {
  try {
    const existingProcesses = await db.select().from(schema_exports.processes).limit(1);
    if (existingProcesses.length > 0) {
      console.log("[Init] Processes already exist, skipping process initialization");
      return;
    }
  } catch (error) {
    console.warn("[Init] Failed to check existing processes:", error);
    return;
  }
  const processes2 = [
    { name: "\u4E0B\u5730", description: "\u65AD\u71B1\u3001\u6839\u592A\u3001FF\u30D2\u30FC\u30BF\u30FC", majorCategory: "\u4E0B\u5730", minorCategory: "\u65AD\u71B1", displayOrder: 1 },
    { name: "\u5730\u8A2D", description: "\u5730\u8A2D", majorCategory: "\u5730\u8A2D", minorCategory: "\u5730\u8A2D", displayOrder: 2 },
    { name: "\u5BB6\u5177", description: "\u5BB6\u5177", majorCategory: "\u5BB6\u5177", minorCategory: "\u5BB6\u5177", displayOrder: 3 },
    { name: "\u4ED5\u4E0A\u3052", description: "\u5E8A\u5F35\u308A\u3001\u58C1\u5F35\u308A\u3001\u5929\u4E95\u5F35\u308A\u3001\u5BB6\u5177\u53D6\u308A\u4ED8\u3051", majorCategory: "\u4ED5\u4E0A\u3052", minorCategory: "\u5E8A\u5F35\u308A", displayOrder: 4 },
    { name: "\u642C\u79FB\u8EE2", description: "\u642C\u79FB\u8EE2", majorCategory: "\u642C\u79FB\u8EE2", minorCategory: "\u642C\u79FB\u8EE2", displayOrder: 5 },
    { name: "\u767B\u9332", description: "\u767B\u9332", majorCategory: "\u767B\u9332", minorCategory: "\u767B\u9332", displayOrder: 6 },
    { name: "\u96D1\u88FD", description: "\u96D1\u88FD", majorCategory: "\u96D1\u88FD", minorCategory: "\u96D1\u88FD", displayOrder: 7 },
    { name: "FRP", description: "FRP", majorCategory: "FRP", minorCategory: "FRP", displayOrder: 8 },
    { name: "\u4FEE\u7406", description: "\u4FEE\u7406", majorCategory: "\u4FEE\u7406", minorCategory: "\u4FEE\u7406", displayOrder: 9 },
    { name: "\u6383\u9664", description: "\u6383\u9664", majorCategory: "\u6383\u9664", minorCategory: "\u6383\u9664", displayOrder: 10 }
  ];
  await db.insert(schema_exports.processes).values(processes2);
  console.log("[Init] Created 10 initial processes");
}

// server/_core/index.ts
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}
async function findAvailablePort(startPort = 8e3) {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}
async function startServer() {
  try {
    await initializeDefaultBreakTimes();
  } catch (error) {
    console.warn("[Server] Failed to initialize break times, continuing anyway:", error);
  }
  try {
    await initializeInitialData();
  } catch (error) {
    console.warn("[Server] Failed to initialize initial data, continuing anyway:", error);
  }
  const app = express2();
  const server = createServer(app);
  app.use(express2.json({ limit: "50mb" }));
  app.use(express2.urlencoded({ limit: "50mb", extended: true }));
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
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
