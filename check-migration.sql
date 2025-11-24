-- マイグレーション前の確認用SQL

-- 1. vehiclesテーブルの構造を確認
DESCRIBE vehicles;

-- 2. categoryカラムが既に存在するか確認
SELECT COLUMN_NAME 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
  AND TABLE_NAME = 'vehicles' 
  AND COLUMN_NAME = 'category';

-- 3. 新しいテーブルが既に存在するか確認
SHOW TABLES LIKE 'checkItems';
SHOW TABLES LIKE 'checkRequests';
SHOW TABLES LIKE 'vehicleChecks';

-- 4. 既存のテーブル一覧を確認
SHOW TABLES;

