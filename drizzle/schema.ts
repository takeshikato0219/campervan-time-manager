import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date } from "drizzle-orm/mysql-core";

// 1. users: ユーザー情報
export const users = mysqlTable("users", {
    id: int("id").autoincrement().primaryKey(),
    username: varchar("username", { length: 64 }).notNull().unique(),
    password: text("password").notNull(),
    name: text("name"),
    role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 2. attendanceRecords: 出退勤記録
export const attendanceRecords = mysqlTable("attendanceRecords", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    clockIn: timestamp("clockIn").notNull(),
    clockOut: timestamp("clockOut"),
    workDuration: int("workDuration"),
    clockInDevice: varchar("clockInDevice", { length: 50 }),
    clockOutDevice: varchar("clockOutDevice", { length: 50 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 3. attendanceEditLogs: 出退勤編集履歴
export const attendanceEditLogs = mysqlTable("attendanceEditLogs", {
    id: int("id").autoincrement().primaryKey(),
    attendanceId: int("attendanceId").notNull(),
    editorId: int("editorId").notNull(),
    fieldName: varchar("fieldName", { length: 50 }).notNull(),
    oldValue: timestamp("oldValue"),
    newValue: timestamp("newValue"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 4. workRecords: 作業記録
export const workRecords = mysqlTable("workRecords", {
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
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 5. vehicles: 車両情報
export const vehicles = mysqlTable("vehicles", {
    id: int("id").autoincrement().primaryKey(),
    vehicleNumber: varchar("vehicleNumber", { length: 100 }).notNull(),
    vehicleTypeId: int("vehicleTypeId").notNull(),
    category: mysqlEnum("category", ["一般", "キャンパー", "中古", "修理", "クレーム"])
        .default("一般")
        .notNull(),
    customerName: varchar("customerName", { length: 255 }),
    desiredDeliveryDate: date("desiredDeliveryDate"),
    checkDueDate: date("checkDueDate"), // チェック期限日
    reserveDate: date("reserveDate"), // 予備権の日付
    reserveRound: varchar("reserveRound", { length: 50 }), // 予備権のR（例: "1R", "2R"）
    hasCoating: mysqlEnum("hasCoating", ["yes", "no"]), // コーティングありなし
    hasLine: mysqlEnum("hasLine", ["yes", "no"]), // ラインありなし
    hasPreferredNumber: mysqlEnum("hasPreferredNumber", ["yes", "no"]), // 希望ナンバーありなし
    hasTireReplacement: mysqlEnum("hasTireReplacement", ["yes", "no"]), // タイヤ交換ありなし
    completionDate: date("completionDate"),
    status: mysqlEnum("status", ["in_progress", "completed", "archived"])
        .default("in_progress")
        .notNull(),
    targetTotalMinutes: int("targetTotalMinutes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 6. vehicleTypes: 車種マスタ
export const vehicleTypes = mysqlTable("vehicleTypes", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    standardTotalMinutes: int("standardTotalMinutes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 7. processes: 工程マスタ
export const processes = mysqlTable("processes", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    majorCategory: varchar("majorCategory", { length: 100 }),
    minorCategory: varchar("minorCategory", { length: 100 }),
    displayOrder: int("displayOrder").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 8. vehicleProcessTargets: 車両別工程目標時間
export const vehicleProcessTargets = mysqlTable("vehicleProcessTargets", {
    id: int("id").autoincrement().primaryKey(),
    vehicleId: int("vehicleId").notNull(),
    processId: int("processId").notNull(),
    targetMinutes: int("targetMinutes").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 9. vehicleTypeProcessStandards: 車種別工程標準時間
export const vehicleTypeProcessStandards = mysqlTable("vehicleTypeProcessStandards", {
    id: int("id").autoincrement().primaryKey(),
    vehicleTypeId: int("vehicleTypeId").notNull(),
    processId: int("processId").notNull(),
    standardMinutes: int("standardMinutes").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 10. breakTimes: 休憩時間設定
export const breakTimes = mysqlTable("breakTimes", {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    startTime: varchar("startTime", { length: 10 }).notNull(), // "HH:MM"
    endTime: varchar("endTime", { length: 10 }).notNull(), // "HH:MM"
    durationMinutes: int("durationMinutes").notNull(),
    isActive: mysqlEnum("isActive", ["true", "false"]).default("true").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 11. vehicleMemos: 車両メモ
export const vehicleMemos = mysqlTable("vehicleMemos", {
    id: int("id").autoincrement().primaryKey(),
    vehicleId: int("vehicleId").notNull(),
    userId: int("userId").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 12. feedbackComments: フィードバックコメント
export const feedbackComments = mysqlTable("feedbackComments", {
    id: int("id").autoincrement().primaryKey(),
    workRecordId: int("workRecordId").notNull(),
    userId: int("userId").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 13. notifications: 通知
export const notifications = mysqlTable("notifications", {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    type: mysqlEnum("type", ["info", "warning", "error"]).default("info").notNull(),
    isRead: mysqlEnum("isRead", ["true", "false"]).default("false").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// 14. checkItems: チェック項目マスタ
export const checkItems = mysqlTable("checkItems", {
    id: int("id").autoincrement().primaryKey(),
    category: mysqlEnum("category", ["一般", "キャンパー", "中古", "修理", "クレーム"]).notNull(),
    majorCategory: varchar("majorCategory", { length: 255 }), // 大カテゴリ
    minorCategory: varchar("minorCategory", { length: 255 }), // 小カテゴリ
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    displayOrder: int("displayOrder").default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 15. vehicleChecks: 車両チェック記録
export const vehicleChecks = mysqlTable("vehicleChecks", {
    id: int("id").autoincrement().primaryKey(),
    vehicleId: int("vehicleId").notNull(),
    checkItemId: int("checkItemId").notNull(),
    checkedBy: int("checkedBy").notNull(), // チェックしたユーザーID
    checkedAt: timestamp("checkedAt").defaultNow().notNull(),
    status: mysqlEnum("status", ["checked", "needs_recheck", "unchecked"])
        .default("checked")
        .notNull(), // チェック状態
    notes: text("notes"), // チェック時のメモ
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 16. checkRequests: チェック依頼
export const checkRequests = mysqlTable("checkRequests", {
    id: int("id").autoincrement().primaryKey(),
    vehicleId: int("vehicleId").notNull(),
    checkItemId: int("checkItemId").notNull(), // 依頼するチェック項目ID
    requestedBy: int("requestedBy").notNull(), // 依頼したユーザーID
    requestedTo: int("requestedTo").notNull(), // 依頼されたユーザーID
    dueDate: date("dueDate"), // 期限日
    status: mysqlEnum("status", ["pending", "completed", "cancelled"])
        .default("pending")
        .notNull(),
    message: text("message"), // 依頼メッセージ
    completedAt: timestamp("completedAt"), // 完了日時
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 17. salesBroadcasts: 営業からの拡散
export const salesBroadcasts = mysqlTable("salesBroadcasts", {
    id: int("id").autoincrement().primaryKey(),
    vehicleId: int("vehicleId").notNull(),
    createdBy: int("createdBy").notNull(), // 作成者（営業）のユーザーID
    message: text("message").notNull(), // コメント
    expiresAt: timestamp("expiresAt").notNull(), // 有効期限（7日後）
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

// 18. salesBroadcastReads: 営業からの拡散の既読記録
export const salesBroadcastReads = mysqlTable("salesBroadcastReads", {
    id: int("id").autoincrement().primaryKey(),
    broadcastId: int("broadcastId").notNull(), // 拡散ID
    userId: int("userId").notNull(), // 読んだユーザーID
    readAt: timestamp("readAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
});

