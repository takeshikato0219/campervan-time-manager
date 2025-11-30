# 作業記録追加問題のデバッグガイド

作業記録が追加されたのに表示されない問題を解決するためのログ確認ガイドです。

## 📍 確認すべきサーバーログ

### Railway本番環境でログを確認する方法

1. **Railwayダッシュボードにアクセス**
   - https://railway.app/ にログイン
   - プロジェクト `campervan-time-manager` を選択
   - 左側メニューから **"Logs"** をクリック

2. **検索キーワードでフィルタ**
   - ログ画面の検索バーに以下のキーワードを入力：
     - `[workRecords.create]` - 作業記録作成時のログ
     - `[getWorkReportDetail]` - 作業記録取得時のログ

## 🔍 確認すべき具体的なログ

### 1. 作業記録作成時のログ

作業記録を追加した直後に、以下のログが表示されるはずです：

```
[workRecords.create] 作業記録を追加: {
  userId: 22,
  vehicleId: 2,
  processId: 2,
  startTimeInput: "2025-11-25T19:11:00+09:00",
  startTimeDate: "2025-11-25T10:11:00.000Z",  ← これが重要（UTC時間）
  startTimeLocal: "2025/11/25 19:11:00",      ← JST時間
  endTimeInput: "2025-11-25T21:11:00+09:00",
  endTimeDate: "2025-11-25T12:11:00.000Z",
  endTimeLocal: "2025/11/25 21:11:00"
}
```

**確認ポイント:**
- `startTimeDate`（UTC時間）が正しいか
- `startTimeLocal`（JST時間）が `2025-11-25` の日付か

### 2. 作業記録取得時のデバッグログ

作業記録を取得する際に、以下のログが表示されます：

```
[getWorkReportDetail] デバッグ: 該当ユーザーの最新10件の作業記録: {
  userId: 22,
  workDate: "2025-11-25",
  records: [
    {
      id: 12,
      startTime: "2025-11-25T10:11:00.000Z",  ← データベースに保存されている時間（UTC）
      startDate: "2025-11-25",                 ← DATE()関数で抽出した日付
      startDateFormatted: "2025-11-25",        ← フォーマットした日付
      matchesWorkDate: true                     ← workDateと一致するか
    },
    ...
  ]
}
```

**確認ポイント:**
- 最新10件の作業記録に、追加した記録（ID: 12など）が含まれているか
- `startDateFormatted` が `workDate`（"2025-11-25"）と一致しているか
- `matchesWorkDate` が `true` になっているか

### 3. 作業記録取得クエリの実行結果

```
[getWorkReportDetail] 作業記録を取得: {
  userId: 22,
  workDate: "2025-11-25",
  query: "SELECT ... WHERE wr.userId = ? AND wr.startTime >= STR_TO_DATE(?, '%Y-%m-%d') ..."
}

[getWorkReportDetail] 取得した作業記録数: 0  ← これが0になっている場合が問題
```

**確認ポイント:**
- `取得した作業記録数` が **0** になっていないか
- もし0の場合は、データベースに保存されている日付と検索条件の日付が一致していない可能性

### 4. 作業記録が取得できた場合の詳細ログ

もし作業記録が取得できた場合、以下のログが表示されます：

```
[getWorkReportDetail] 取得した作業記録数: 1

[getWorkReportDetail] 作業記録の詳細: [
  {
    id: 12,
    startTime: "2025-11-25T10:11:00.000Z",
    endTime: "2025-11-25T12:11:00.000Z",
    vehicleId: 2
  }
]
```

## 🐛 問題のパターンと対処法

### パターン1: 作業記録は作成されているが、取得できない

**症状:**
- `[workRecords.create]` のログは表示される（記録が作成されている）
- `[getWorkReportDetail] 取得した作業記録数: 0` になる

**原因:**
- データベースに保存されている時刻（UTC）と検索条件の日付が一致していない
- 例: 保存時刻が `2025-11-24 23:30:00 UTC`（JSTでは `2025-11-25 08:30:00`）の場合、`workDate: "2025-11-25"` で検索しても見つからない

**確認方法:**
1. `[getWorkReportDetail] デバッグ: 該当ユーザーの最新10件の作業記録` のログを確認
2. 追加した記録の `startDateFormatted` が `workDate` と一致しているか確認

### パターン2: 作業記録が作成されていない

**症状:**
- `[workRecords.create]` のログが表示されない
- エラーログが表示される

**対処:**
- エラーメッセージを確認して、原因を特定する

## 📋 ログ共有時のチェックリスト

問題が続く場合、以下の情報を含めて共有してください：

1. ✅ `[workRecords.create] 作業記録を追加:` のログ全文
2. ✅ `[getWorkReportDetail] デバッグ: 該当ユーザーの最新10件の作業記録:` のログ全文
3. ✅ `[getWorkReportDetail] 取得した作業記録数:` のログ
4. ✅ 作業記録を追加した時刻（クライアント側の時刻）
5. ✅ `workDate` の値（例: "2025-11-25"）

これらの情報があれば、問題の原因を特定できます。

