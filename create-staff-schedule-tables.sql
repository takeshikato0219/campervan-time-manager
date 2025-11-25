-- staffScheduleEntriesテーブルを作成
CREATE TABLE IF NOT EXISTS `staffScheduleEntries` (
    `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
    `userId` int NOT NULL,
    `scheduleDate` date NOT NULL,
    `status` enum('work','rest','request','exhibition','other','morning','afternoon') DEFAULT 'work' NOT NULL,
    `comment` varchar(100),
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- staffScheduleDisplayOrderテーブルを作成
CREATE TABLE IF NOT EXISTS `staffScheduleDisplayOrder` (
    `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
    `userId` int NOT NULL UNIQUE,
    `displayOrder` int NOT NULL,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
    `updatedAt` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);

-- staffScheduleEditLogsテーブルを作成
CREATE TABLE IF NOT EXISTS `staffScheduleEditLogs` (
    `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
    `userId` int NOT NULL,
    `editorId` int NOT NULL,
    `fieldName` varchar(50) NOT NULL,
    `oldValue` text,
    `newValue` text,
    `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

