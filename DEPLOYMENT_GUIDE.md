# デプロイガイド

このプロジェクトを他の環境にデプロイする方法を説明します。

## 📋 デプロイ前の準備

### 1. 環境変数の準備

`.env`ファイルに以下の環境変数を設定してください：

```env
# アプリケーションID
VITE_APP_ID=your_app_id_here

# JWT秘密鍵（認証用）- ランダムな文字列を生成
JWT_SECRET=your_jwt_secret_here

# データベース接続URL（MySQL形式）
DATABASE_URL=mysql://user:password@host:port/database

# OAuthサーバーURL（使用する場合）
OAUTH_SERVER_URL=https://your-oauth-server.com

# オーナーのOpenID（使用する場合）
OWNER_OPEN_ID=your_owner_open_id_here

# サーバーポート（デフォルト: 8000）
PORT=8000

# 環境（production）
NODE_ENV=production
```

### 2. データベースの準備

MySQLデータベースを用意し、接続情報を`DATABASE_URL`に設定してください。

## 🚀 デプロイ方法

### 方法1: Dockerを使用（推奨）

#### ローカル環境

```bash
# 1. Docker Composeでビルドと起動
docker-compose up -d

# 2. ログを確認
docker-compose logs -f

# 3. 停止
docker-compose down
```

#### サーバー環境（VPS、クラウドサーバーなど）

```bash
# 1. プロジェクトをサーバーにアップロード
# Gitを使用する場合
git clone https://github.com/your-username/campervan-time-manager.git
cd campervan-time-manager

# 2. .envファイルを作成・編集
nano .env

# 3. Docker Composeで起動
docker-compose up -d

# 4. ログを確認
docker-compose logs -f
```

### 方法2: Railway（クラウド - 簡単）

1. **Railwayアカウントを作成**
   - https://railway.app/ にアクセス
   - GitHubアカウントでログイン

2. **プロジェクトを接続**
   - "New Project" → "Deploy from GitHub repo"
   - このリポジトリを選択

3. **環境変数を設定**
   - Railwayのダッシュボード → Variables
   - 必要な環境変数を追加：
     - `VITE_APP_ID`
     - `JWT_SECRET`
     - `DATABASE_URL`（RailwayのMySQLアドオンを使用する場合、自動で設定されます）
     - `NODE_ENV=production`
     - `PORT=8000`

4. **ビルド設定**
   - Settings → Build & Deploy
   - Build Command: `pnpm build`
   - Start Command: `pnpm start`

5. **デプロイ**
   - Railwayが自動的にデプロイを開始します
   - デプロイ完了後、URLが表示されます

### 方法3: Vercel / Netlify（フロントエンドのみ）

**注意**: この方法はフロントエンドのみのデプロイです。バックエンドは別途用意する必要があります。

#### Vercel

1. Vercelアカウントを作成
2. プロジェクトをインポート
3. 環境変数を設定
4. デプロイ

#### Netlify

1. Netlifyアカウントを作成
2. プロジェクトをインポート
3. 環境変数を設定
4. デプロイ

### 方法4: 従来のサーバー（VPS、専用サーバーなど）

```bash
# 1. サーバーにSSH接続
ssh user@your-server.com

# 2. Node.jsとpnpmをインストール
# Node.js 18以上が必要
curl -fsSL https://get.pnpm.io/install.sh | sh -

# 3. プロジェクトをクローン
git clone https://github.com/your-username/campervan-time-manager.git
cd campervan-time-manager

# 4. 依存関係をインストール
pnpm install

# 5. 環境変数を設定
nano .env

# 6. データベースマイグレーション
pnpm db:push

# 7. ビルド
pnpm build

# 8. PM2などでプロセス管理（推奨）
npm install -g pm2
pm2 start dist/index.js --name campervan-time-manager
pm2 save
pm2 startup
```

### 方法5: AWS / GCP / Azure（クラウド）

#### AWS（EC2 + RDS）

1. EC2インスタンスを作成
2. RDS（MySQL）を作成
3. EC2にSSH接続してアプリケーションをデプロイ
4. セキュリティグループでポート8000を開放

#### GCP（Cloud Run）

1. Cloud Runサービスを作成
2. Dockerfileを使用してコンテナイメージをビルド
3. Cloud SQL（MySQL）を作成
4. 環境変数を設定してデプロイ

#### Azure（App Service）

1. App Serviceを作成
2. Azure Database for MySQLを作成
3. デプロイセンターでGitHubと接続
4. 環境変数を設定

## 🔧 デプロイ後の設定

### 1. データベースの初期化

```bash
# サーバーに接続して実行
pnpm db:push

# または、初期データを作成
node server/init-data.js
```

### 2. リバースプロキシの設定（Nginx）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 3. SSL証明書の設定（Let's Encrypt）

```bash
# Certbotをインストール
sudo apt-get install certbot python3-certbot-nginx

# SSL証明書を取得
sudo certbot --nginx -d your-domain.com
```

## 📝 よくある質問

### Q: どのデプロイ方法がおすすめですか？

**A:** 
- **初心者**: Railway（簡単、無料枠あり）
- **中級者**: Docker（柔軟性が高い）
- **上級者**: AWS/GCP/Azure（スケーラビリティが高い）

### Q: データベースはどこに用意すればいいですか？

**A:**
- Railway: RailwayのMySQLアドオンを使用
- Docker: 別途MySQLコンテナを起動
- クラウド: RDS、Cloud SQL、Azure Databaseなど
- 自前サーバー: MySQLを直接インストール

### Q: 環境変数はどこで設定しますか？

**A:**
- Railway: ダッシュボードのVariables
- Docker: `.env`ファイルまたは`docker-compose.yml`
- サーバー: `.env`ファイルまたは環境変数

### Q: デプロイ後、エラーが発生する場合は？

**A:**
1. ログを確認（`docker-compose logs` または `pm2 logs`）
2. 環境変数が正しく設定されているか確認
3. データベース接続が正常か確認
4. ポートが正しく開放されているか確認

## 🔐 セキュリティチェックリスト

- [ ] `JWT_SECRET`を強力なランダム文字列に設定
- [ ] データベースのパスワードを強力に設定
- [ ] 本番環境では`NODE_ENV=production`を設定
- [ ] HTTPSを有効化（SSL証明書を設定）
- [ ] ファイアウォールで必要なポートのみ開放
- [ ] 定期的にバックアップを取得

## 📚 参考リンク

- [Railway公式ドキュメント](https://docs.railway.app/)
- [Docker公式ドキュメント](https://docs.docker.com/)
- [Vercel公式ドキュメント](https://vercel.com/docs)
- [Netlify公式ドキュメント](https://docs.netlify.com/)

