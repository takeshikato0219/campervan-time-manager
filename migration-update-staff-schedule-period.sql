-- スタッフ休み予定の期間を21日～20日締に変更するためのマイグレーション
-- 新しいステータス項目を追加: business_trip, exhibition_duty, paid_leave, delivery, payment_date

-- statusカラムのENUM型を変更（新しいステータスを追加）
ALTER TABLE `staffScheduleEntries` MODIFY COLUMN `status` ENUM(
    'work',
    'rest',
    'request',
    'exhibition',
    'other',
    'morning',
    'afternoon',
    'business_trip',
    'exhibition_duty',
    'paid_leave',
    'delivery',
    'payment_date'
) DEFAULT 'work' NOT NULL;

