-- スタッフスケジュール関連テーブルの作成

-- 1. staffScheduleEntries: スタッフスケジュールエントリ
CREATE TABLE IF NOT EXISTS `staffScheduleEntries` (
    `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
    `userId` int NOT NULL,
    `scheduleDate` date NOT NULL,
    `status` ENUM('work', 'rest', 'request', 'exhibition', 'other') NOT NULL DEFAULT 'work',
    `comment` varchar(100),
    `createdAt` timestamp NOT NULL DEFAULT (now()),
    `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE now()
);

-- 2. staffScheduleDisplayOrder: スタッフの表示順序
CREATE TABLE IF NOT EXISTS `staffScheduleDisplayOrder` (
    `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
    `userId` int NOT NULL UNIQUE,
    `displayOrder` int NOT NULL,
    `createdAt` timestamp NOT NULL DEFAULT (now()),
    `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE now()
);

-- 3. staffScheduleEditLogs: スタッフ名変更の履歴
CREATE TABLE IF NOT EXISTS `staffScheduleEditLogs` (
    `id` int AUTO_INCREMENT NOT NULL PRIMARY KEY,
    `userId` int NOT NULL,
    `editorId` int NOT NULL,
    `fieldName` varchar(50) NOT NULL,
    `oldValue` text,
    `newValue` text,
    `createdAt` timestamp NOT NULL DEFAULT (now())
);

