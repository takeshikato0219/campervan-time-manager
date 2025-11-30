# サーバーログの確認方法

エラーが発生した際に、サーバーログを確認することで原因を特定できます。

## 📍 本番環境（Railway）

### 方法1: Railwayダッシュボードで確認

1. **Railwayアカウントにログイン**
   - https://railway.app/ にアクセス
   - ログインしてプロジェクトを選択

2. **デプロイメントを選択**
   - プロジェクトの一覧から `campervan-time-manager` を選択
   - 左側のメニューから **"Deployments"** をクリック
   - 最新のデプロイメントをクリック

3. **ログを確認**
   - デプロイメントページの上部に **"View Logs"** または **"Logs"** ボタンがあります
   - クリックするとリアルタイムログが表示されます
   - または、左側のメニューから **"Logs"** を直接選択することもできます

4. **エラーログを検索**
   - ログ画面の検索バーに以下のキーワードを入力して検索できます：
     - `[deliverySchedules.update]` - 状態変更時のエラー
     - `❌` - すべてのエラー
     - `INTERNAL_SERVER_ERROR` - サーバーエラー
     - `Unknown column` - カラム関連のエラー

### 方法2: Railway CLIで確認（コマンドライン）

```bash
# Railway CLIをインストール（未インストールの場合）
npm install -g @railway/cli

# ログイン
railway login

# プロジェクトを選択
railway link

# ログをリアルタイムで表示
railway logs

# 特定のキーワードでフィルタ
railway logs | grep "deliverySchedules.update"
```

## 💻 ローカル開発環境

### 開発サーバー実行中

開発サーバーを起動しているターミナルで、直接ログが表示されます：

```bash
# 開発サーバーを起動
pnpm dev
```

エラーが発生すると、ターミナルに以下のようなログが表示されます：

```
[deliverySchedules.update] ❌ Update error: ...
[deliverySchedules.update] ❌ Error message: ...
[deliverySchedules.update] ❌ Error code: ...
[deliverySchedules.update] ❌ SQL query: ...
[deliverySchedules.update] ❌ SQL values: ...
```

### 本番モードで実行中

```bash
# ビルド
pnpm build

# 本番モードで起動
pnpm start
```

エラーは同じターミナルに表示されます。

## 🔍 確認すべきログ情報

エラーが発生した際に、以下の情報があると原因特定に役立ちます：

1. **エラーメッセージ**
   ```
   [deliverySchedules.update] ❌ Error message: ...
   ```

2. **SQLクエリ**
   ```
   [deliverySchedules.update] Executing SQL: UPDATE ...
   [deliverySchedules.update] ❌ SQL query: ...
   ```

3. **SQL値**
   ```
   [deliverySchedules.update] Values: [...]
   [deliverySchedules.update] ❌ SQL values: ...
   ```

4. **更新データ**
   ```
   [deliverySchedules.update] ❌ Update data was: {...}
   ```

5. **エラーコード**
   ```
   [deliverySchedules.update] ❌ Error code: ...
   ```

## 📋 よくあるエラーパターン

### 1. `Unknown column 'xxx' in 'field list'`
- **意味**: データベースにカラムが存在しない
- **対処**: カラムを追加する必要があります。開発者に報告してください。

### 2. `Data truncated for column 'status' at row 1`
- **意味**: ENUM値が不正
- **対処**: 送信されている値が正しいか確認してください。

### 3. `INTERNAL_SERVER_ERROR`
- **意味**: サーバー内部エラー
- **対処**: 詳細なログを確認して原因を特定します。

## 📞 エラーログの共有方法

エラーが発生した場合、以下の情報を共有してください：

1. **エラーメッセージ全文**（上記のログ情報すべて）
2. **実行した操作**（例：「状態を変更しようとした」）
3. **変更しようとした値**（例：「katomo在庫中 → ワングラム保管中」）
4. **発生時刻**

これにより、迅速に問題を解決できます。

