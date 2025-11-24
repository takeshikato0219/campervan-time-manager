-- 手動マイグレーションSQL
-- 既存のテーブルがある場合に実行してください

-- 1. vehiclesテーブルにcategoryカラムを追加（既に存在する場合はスキップ）
ALTER TABLE `vehicles` 
ADD COLUMN `category` enum('一般','キャンパー','中古','修理','クレーム') DEFAULT '一般' NOT NULL
AFTER `vehicleTypeId`;

-- 2. checkItemsテーブルを作成（既に存在する場合はスキップ）
CREATE TABLE IF NOT EXISTS `checkItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('一般','キャンパー','中古','修理','クレーム') NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`displayOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkItems_id` PRIMARY KEY(`id`)
);

-- 3. checkRequestsテーブルを作成（既に存在する場合はスキップ）
CREATE TABLE IF NOT EXISTS `checkRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`requestedBy` int NOT NULL,
	`requestedTo` int NOT NULL,
	`status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`message` text,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkRequests_id` PRIMARY KEY(`id`)
);

-- 4. vehicleChecksテーブルを作成（既に存在する場合はスキップ）
CREATE TABLE IF NOT EXISTS `vehicleChecks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`checkItemId` int NOT NULL,
	`checkedBy` int NOT NULL,
	`checkedAt` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `vehicleChecks_id` PRIMARY KEY(`id`)
);

