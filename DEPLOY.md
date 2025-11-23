# デプロイ手順

## 現在の状況

Dockerがインストールされていないため、以下のいずれかの方法でデプロイしてください。

## 方法1: Dockerをインストールしてデプロイ（推奨）

### macOSでのDockerインストール

1. **Docker Desktop for Macをインストール**
   - https://www.docker.com/products/docker-desktop/ からダウンロード
   - インストール後、Docker Desktopを起動

2. **デプロイ実行**
   ```bash
   # 環境変数ファイルを作成（必要に応じて編集）
   # .envファイルに必要な環境変数を設定してください
   
   # Docker Composeでビルドと起動
   docker-compose up -d
   
   # ログを確認
   docker-compose logs -f
   ```

## 方法2: Railwayにデプロイ（クラウド）

1. **Railwayアカウントを作成**
   - https://railway.app/ にアクセス
   - GitHubアカウントでログイン

2. **プロジェクトを接続**
   - "New Project" → "Deploy from GitHub repo"
   - このリポジトリを選択

3. **環境変数を設定**
   - Railwayのダッシュボードで環境変数を設定：
     - `VITE_APP_ID`
     - `JWT_SECRET`
     - `DATABASE_URL`
     - `OAUTH_SERVER_URL`
     - `OWNER_OPEN_ID`
     - その他必要な環境変数

4. **ビルド設定**
   - Build Command: `pnpm build`
   - Start Command: `pnpm start`

5. **デプロイ**
   - Railwayが自動的にデプロイを開始します

## 方法3: ローカルでビルドして実行

```bash
# 依存関係のインストール（既にインストール済みの場合はスキップ）
npx pnpm install

# 環境変数ファイルを作成
# .envファイルに必要な環境変数を設定してください

# ビルド
npx pnpm build

# 本番環境で起動
NODE_ENV=production npx pnpm start
```

## 必要な環境変数

`.env`ファイルに以下の環境変数を設定してください：

```env
VITE_APP_ID=your_app_id_here
JWT_SECRET=your_jwt_secret_here
DATABASE_URL=mysql://user:password@host:port/database
OAUTH_SERVER_URL=https://your-oauth-server.com
OWNER_OPEN_ID=your_owner_open_id_here
PORT=8000
NODE_ENV=production
```

## トラブルシューティング

### Dockerがインストールできない場合
- Docker Desktopのシステム要件を確認
- または、Railwayなどのクラウドサービスを使用

### ビルドエラーが発生する場合
- Node.jsのバージョンが18以上であることを確認
- `npx pnpm install`で依存関係を再インストール

### 環境変数エラーが発生する場合
- `.env`ファイルがプロジェクトルートに存在することを確認
- すべての必須環境変数が設定されていることを確認

