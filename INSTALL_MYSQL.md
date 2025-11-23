# MySQLインストール手順

## ステップ1: Homebrewをインストール（まだの場合）

ターミナルで以下を実行してください：

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

インストール後、パスを設定：

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zshrc
eval "$(/opt/homebrew/bin/brew shellenv)"
```

## ステップ2: MySQLをインストール

```bash
brew install mysql
```

## ステップ3: MySQLサービスを起動

```bash
brew services start mysql
```

## ステップ4: MySQLの初期設定（初回のみ）

```bash
mysql_secure_installation
```

パスワードを設定してください（後で使用します）。

## ステップ5: データベースを作成

```bash
mysql -u root -p
```

MySQLコンソールで以下を実行：

```sql
CREATE DATABASE campervan_time_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

## ステップ6: .envファイルを更新

`.env`ファイルを開いて、`DATABASE_URL`を設定：

```env
DATABASE_URL=mysql://root:your_password@localhost:3306/campervan_time_manager
```

（`your_password`をステップ4で設定したパスワードに置き換えてください）

## ステップ7: マイグレーションを実行

```bash
cd /Users/ttk/Desktop/campervan-time-manager
pnpm db:push
```

## ステップ8: サーバーを再起動

```bash
pnpm dev
```

## 確認

サーバー起動時に以下のメッセージが表示されれば成功です：

```
[Database] Default break times initialized
[Init] Created admin account (admin/admin123) and 40 staff accounts (user001-user040/password)
[Init] Created 10 initial processes
[Init] Initial data initialized successfully
Server running on http://localhost:8000/
```

## トラブルシューティング

### MySQLに接続できない場合

1. MySQLサービスが起動しているか確認：
   ```bash
   brew services list
   ```

2. 手動で起動：
   ```bash
   brew services start mysql
   ```

### パスワードを忘れた場合

```bash
brew services stop mysql
mysqld_safe --skip-grant-tables &
mysql -u root
```

MySQLコンソールで：
```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
EXIT;
```

その後、MySQLを再起動：
```bash
brew services restart mysql
```

