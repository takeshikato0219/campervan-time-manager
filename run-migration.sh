#!/bin/bash

# データベースマイグレーション実行スクリプト
# 使用方法: ./run-migration.sh

# .envファイルからDATABASE_URLを読み込む
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# DATABASE_URLから接続情報を抽出
if [ -z "$DATABASE_URL" ]; then
    echo "エラー: DATABASE_URLが設定されていません"
    echo ".envファイルにDATABASE_URLを設定してください"
    exit 1
fi

# DATABASE_URLの形式: mysql://user:password@host:port/database
# または: mysql://user:password@host/database

# パース（簡単な方法）
DB_URL=${DATABASE_URL#mysql://}
CREDENTIALS=${DB_URL%%@*}
HOST_PORT=${DB_URL#*@}
HOST_PORT=${HOST_PORT%%/*}
DATABASE=${DB_URL#*/}
DATABASE=${DATABASE%%\?*}

USER=${CREDENTIALS%%:*}
PASSWORD=${CREDENTIALS#*:}
HOST=${HOST_PORT%%:*}
PORT=${HOST_PORT#*:}
PORT=${PORT:-3306}

echo "データベース接続情報:"
echo "  ホスト: $HOST"
echo "  ポート: $PORT"
echo "  データベース: $DATABASE"
echo "  ユーザー: $USER"
echo ""
echo "マイグレーションを実行しますか？ (y/n)"
read -r response

if [ "$response" != "y" ]; then
    echo "キャンセルしました"
    exit 0
fi

# MySQLコマンドで実行
mysql -h "$HOST" -P "$PORT" -u "$USER" -p"$PASSWORD" "$DATABASE" < manual-migration-safe.sql

if [ $? -eq 0 ]; then
    echo "マイグレーションが完了しました！"
else
    echo "エラー: マイグレーションに失敗しました"
    echo "手動で実行する場合は、MIGRATION_GUIDE.mdを参照してください"
    exit 1
fi

