-- staffScheduleEntriesテーブルのstatusカラムに「morning」「afternoon」を追加
-- 既存のENUMに値を追加する

ALTER TABLE `staffScheduleEntries` 
MODIFY COLUMN `status` ENUM('work','rest','request','exhibition','other','morning','afternoon') DEFAULT 'work' NOT NULL;

