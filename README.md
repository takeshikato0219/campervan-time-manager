# Campervan Time Manager

キャンピングカーの時間管理アプリケーション

## セットアップ

### 必要な環境

- Node.js 18以上
- pnpm 10以上
- MySQLデータベース

### インストール

```bash
pnpm install
```

### 環境変数の設定

プロジェクトルートに `.env` ファイルを作成し、以下の環境変数を設定してください：

```env
# アプリケーションID
VITE_APP_ID=your_app_id_here

# JWT秘密鍵（認証用）
JWT_SECRET=your_jwt_secret_here

# データベース接続URL（MySQL形式）
# 例: mysql://user:password@host:port/database
DATABASE_URL=mysql://user:password@localhost:3306/campervan_time_manager

# OAuthサーバーURL
OAUTH_SERVER_URL=https://your-oauth-server.com

# オーナーのOpenID
OWNER_OPEN_ID=your_owner_open_id_here

# Forge API設定（オプション）
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=

# サーバーポート（デフォルト: 8000）
PORT=8000

# 環境（development または production）
NODE_ENV=production
```

### データベースのセットアップ

```bash
# マイグレーションの生成と実行
pnpm db:push
```

## 開発

### 開発サーバーの起動

```bash
pnpm dev
```

開発サーバーは `http://localhost:8000` で起動します。

## ビルドとデプロイ

### ビルド

```bash
pnpm build
```

これにより以下が実行されます：
1. クライアント（React）のビルド
2. サーバー（Express）のバンドル

ビルド成果物は `dist/` ディレクトリに出力されます。

### 本番環境での起動

```bash
pnpm start
```

本番環境では、`NODE_ENV=production` が設定されている必要があります。

## デプロイ方法

### Railway

1. Railwayにプロジェクトを接続
2. 環境変数を設定
3. ビルドコマンド: `pnpm build`
4. 起動コマンド: `pnpm start`

### Vercel / Netlify

サーバーレス環境では、サーバーサイドのExpressアプリケーションを別途デプロイする必要があります。

### Docker

#### Docker Composeを使用（推奨）

**本番環境:**

```bash
# 環境変数ファイルを作成
cp .env.example .env
# .envファイルを編集して必要な値を設定

# ビルドと起動
docker-compose up -d

# ログを確認
docker-compose logs -f

# 停止
docker-compose down
```

**開発環境:**

```bash
# 開発用のdocker-composeを使用
docker-compose -f docker-compose.dev.yml up
```

#### Dockerコマンドを直接使用

```bash
# イメージをビルド
docker build -t campervan-time-manager .

# コンテナを起動
docker run -d \
  --name campervan-time-manager \
  -p 8000:8000 \
  --env-file .env \
  --restart unless-stopped \
  campervan-time-manager

# ログを確認
docker logs -f campervan-time-manager

# 停止
docker stop campervan-time-manager
docker rm campervan-time-manager
```

#### Docker Hubへのデプロイ

```bash
# イメージにタグを付ける
docker tag campervan-time-manager your-username/campervan-time-manager:latest

# Docker Hubにプッシュ
docker push your-username/campervan-time-manager:latest

# 他のサーバーで実行
docker run -d \
  --name campervan-time-manager \
  -p 8000:8000 \
  -e VITE_APP_ID=your_app_id \
  -e JWT_SECRET=your_secret \
  -e DATABASE_URL=your_database_url \
  your-username/campervan-time-manager:latest
```

## プロジェクト構造

```
campervan-time-manager/
├── client/          # フロントエンド（React + Vite）
│   ├── src/
│   └── public/
├── server/          # バックエンド（Express + tRPC）
│   ├── _core/       # コア機能
│   └── routers.ts   # tRPCルーター
├── dist/            # ビルド成果物
└── drizzle/         # データベースマイグレーション
```

## 技術スタック

- **フロントエンド**: React 19, Vite, TypeScript, Tailwind CSS
- **バックエンド**: Express, tRPC, TypeScript
- **データベース**: MySQL (Drizzle ORM)
- **認証**: OAuth, JWT

## ライセンス

MIT






