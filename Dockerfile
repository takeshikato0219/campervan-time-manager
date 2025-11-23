# ビルドステージ
FROM node:20-alpine AS builder

# pnpmをインストール
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# 依存関係ファイルをコピー
COPY package.json pnpm-lock.yaml ./

# 依存関係をインストール
RUN pnpm install --frozen-lockfile

# ソースコードをコピー（.dockerignoreで除外されたファイルはコピーされない）
COPY . .

# ビルド
RUN pnpm build

# 本番ステージ
FROM node:20-alpine

# セキュリティのため、非rootユーザーを作成
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# pnpmをインストール
RUN corepack enable && corepack prepare pnpm@10.4.1 --activate

WORKDIR /app

# 依存関係ファイルをコピー
COPY package.json pnpm-lock.yaml ./

# 本番用の依存関係のみをインストール
RUN pnpm install --frozen-lockfile --prod && \
    pnpm store prune

# ビルド成果物をコピー
COPY --from=builder /app/dist ./dist

# 所有権を変更
RUN chown -R nodejs:nodejs /app

# 非rootユーザーに切り替え
USER nodejs

# ポートを公開
EXPOSE 8000

# 環境変数
ENV NODE_ENV=production
ENV PORT=8000

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8000/api/trpc', (r) => {process.exit(r.statusCode === 404 ? 0 : 1)})"

# アプリケーションを起動
CMD ["node", "dist/index.js"]

