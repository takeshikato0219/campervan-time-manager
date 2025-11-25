-- staffScheduleEntriesテーブルの構造を確認
DESCRIBE `staffScheduleEntries`;

-- scheduleDateカラムの型を確認
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM 
    INFORMATION_SCHEMA.COLUMNS
WHERE 
    TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'staffScheduleEntries'
    AND COLUMN_NAME = 'scheduleDate';

-- テーブルが存在するか確認
SHOW TABLES LIKE 'staffScheduleEntries';

