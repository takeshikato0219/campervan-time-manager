-- 既存の管理者を準管理者に変更し、新しい管理者役職を追加するマイグレーション

-- 1. roleカラムのENUM型を変更（既存の"admin"を"sub_admin"に変更し、新しい"admin"を追加）
ALTER TABLE `users` MODIFY COLUMN `role` ENUM('user', 'sub_admin', 'admin') NOT NULL DEFAULT 'user';

-- 2. 既存の"admin"ロールを"sub_admin"に変更
UPDATE `users` SET `role` = 'sub_admin' WHERE `role` = 'admin';

-- 注意: 新しい管理者アカウントを作成する場合は、以下のSQLを実行してください:
-- INSERT INTO `users` (`username`, `password`, `name`, `role`) 
-- VALUES ('superadmin', '$2a$10$...', 'スーパー管理者', 'admin');
-- （パスワードはbcryptでハッシュ化されたものを使用してください）

