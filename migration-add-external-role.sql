-- externalロール（社外アカウント）を追加するマイグレーション

-- roleカラムのENUM型を変更（externalを追加）
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('field_worker', 'sales_office', 'sub_admin', 'admin', 'external') NOT NULL DEFAULT 'field_worker';

