# データベースマイグレーション手順

## 概要
車両区分とチェック機能を追加するためのデータベースマイグレーション手順です。

## 必要な変更

1. `vehicles`テーブルに`category`カラムを追加
2. `checkItems`テーブルを作成（チェック項目マスタ）
3. `checkRequests`テーブルを作成（チェック依頼）
4. `vehicleChecks`テーブルを作成（チェック記録）

## 実行前の確認

まず、現在のデータベースの状態を確認してください：

```bash
# MySQLに接続
mysql -u [ユーザー名] -p [データベース名]

# 確認用SQLを実行
source check-migration.sql
```

または、直接SQLを実行：

```sql
-- vehiclesテーブルの構造を確認
DESCRIBE vehicles;

-- categoryカラムが既に存在するか確認
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'vehicles' 
  AND COLUMN_NAME = 'category';

-- 新しいテーブルが既に存在するか確認
SHOW TABLES LIKE 'checkItems';
SHOW TABLES LIKE 'checkRequests';
SHOW TABLES LIKE 'vehicleChecks';
```

## 実行方法

### 方法1: MySQLコマンドラインから実行（推奨）

```bash
# MySQLに接続
mysql -u [ユーザー名] -p [データベース名]

# SQLファイルを実行
source manual-migration-safe.sql
```

**注意**: `category`カラムが既に存在する場合は、`ALTER TABLE`の行でエラーになります。その場合は、`manual-migration-safe.sql`から該当行を削除してから実行してください。

### 方法2: ターミナルから直接実行

```bash
# .envファイルからDATABASE_URLを確認して、データベース名を取得
# 例: mysql://user:password@localhost:3306/campervan_time_manager の場合
# データベース名は campervan_time_manager

mysql -u [ユーザー名] -p [データベース名] < manual-migration-safe.sql
```

### 方法3: データベース管理ツールを使用

phpMyAdmin、MySQL Workbench、DBeaverなどのツールを使用して、`manual-migration-safe.sql`の内容を実行してください。

### 方法4: 手動で1つずつ実行（最も安全）

MySQLコマンドラインまたは管理ツールで、以下のSQLを1つずつ実行してください：

```sql
-- ステップ1: vehiclesテーブルにcategoryカラムを追加
-- （既に存在する場合はエラーになります。その場合はスキップしてください）
ALTER TABLE `vehicles` 
ADD COLUMN `category` enum('一般','キャンパー','中古','修理','クレーム') DEFAULT '一般' NOT NULL
AFTER `vehicleTypeId`;

-- ステップ2: checkItemsテーブルを作成
CREATE TABLE IF NOT EXISTS `checkItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('一般','キャンパー','中古','修理','クレーム') NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`displayOrder` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkItems_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ステップ3: checkRequestsテーブルを作成
CREATE TABLE IF NOT EXISTS `checkRequests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` int NOT NULL,
	`requestedBy` int NOT NULL,
	`requestedTo` int NOT NULL,
	`status` enum('pending','completed','cancelled') NOT NULL DEFAULT 'pending',
	`message` text,
	`completedAt` timestamp NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `checkRequests_id` PRIMARY KEY(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ステップ4: vehicleChecksテーブルを作成
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 注意事項

- 既存のデータがある場合、`vehicles`テーブルの既存レコードには`category`が`'一般'`で設定されます
- テーブルが既に存在する場合は、`CREATE TABLE IF NOT EXISTS`によりエラーになりません
- **重要**: `category`カラムが既に存在する場合は、`ALTER TABLE`でエラーになります。その場合は、該当するSQL文をスキップしてください

## 実行後の確認

マイグレーションが成功したか確認：

```sql
-- vehiclesテーブルにcategoryカラムが追加されたか確認
DESCRIBE vehicles;

-- 新しいテーブルが作成されたか確認
SHOW TABLES LIKE 'check%';
SHOW TABLES LIKE 'vehicleChecks';

-- 各テーブルの構造を確認
DESCRIBE checkItems;
DESCRIBE checkRequests;
DESCRIBE vehicleChecks;
```

## トラブルシューティング

### categoryカラムが既に存在する場合

```sql
-- エラー: Duplicate column name 'category'
-- この場合は、ALTER TABLEの行をスキップして、残りのテーブル作成のみ実行してください
```

### テーブルが既に存在する場合

`CREATE TABLE IF NOT EXISTS`を使用しているため、エラーにはなりません。既存のテーブルはそのまま残ります。

### 権限エラーが発生する場合

```sql
-- エラー: Access denied
-- データベースの管理者権限が必要です。管理者に依頼してください
```

