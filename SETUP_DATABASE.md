# データベースセットアップ手順

## 問題

現在、`DATABASE_URL`が設定されていないため、ログインできません。

## 解決方法

### 方法1: MySQLデータベースを設定する（推奨）

1. **MySQLをインストール**（まだの場合）
   ```bash
   # macOS (Homebrew)
   brew install mysql
   brew services start mysql
   ```

2. **データベースを作成**
   ```bash
   mysql -u root -p
   ```
   
   MySQLコンソールで：
   ```sql
   CREATE DATABASE campervan_time_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   EXIT;
   ```

3. **`.env`ファイルを更新**
   ```env
   DATABASE_URL=mysql://root:your_password@localhost:3306/campervan_time_manager
   ```
   （`your_password`を実際のMySQLパスワードに置き換えてください）

4. **マイグレーションを実行**
   ```bash
   pnpm db:push
   ```

5. **サーバーを再起動**
   ```bash
   pnpm dev
   ```

### 方法2: SQLiteを使用する（簡単）

SQLiteを使用する場合は、`drizzle.config.ts`と`server/db.ts`を修正する必要があります。

### 方法3: 開発用のモックデータベース

開発中は、メモリ内のモックデータを使用することもできますが、本番環境では使用できません。

## 確認

データベース接続が成功すると、サーバー起動時に以下のメッセージが表示されます：

```
[Database] Default break times initialized
[Init] Created admin account (admin/admin123) and 40 staff accounts (user001-user040/password)
[Init] Created 10 initial processes
[Init] Initial data initialized successfully
```

## ログイン情報

データベースが正しく設定されると、以下のアカウントでログインできます：

- **管理者**: `admin` / `admin123`
- **スタッフ**: `user001`～`user040` / `password`

