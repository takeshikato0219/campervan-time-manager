-- staffScheduleEntriesテーブルのscheduleDateカラムをdate型に修正
-- 既存のデータがある場合は、まずバックアップを取ってください

-- カラム型を確認
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_TYPE
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'staffScheduleEntries'
    AND COLUMN_NAME = 'scheduleDate';

-- カラム型がdate型でない場合、以下のSQLを実行してください
-- ALTER TABLE `staffScheduleEntries` 
-- MODIFY COLUMN `scheduleDate` DATE NOT NULL;

