// ログインをテストするスクリプト
import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";

dotenv.config();

async function testLogin() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.log("❌ DATABASE_URLが設定されていません");
        return;
    }

    try {
        const connection = await createConnection(url);
        console.log("✅ データベースに接続できました");

        // adminユーザーを取得
        const [users] = await connection.execute(
            "SELECT id, username, password, name, role FROM users WHERE username = ?",
            ["admin"]
        );

        if (users.length === 0) {
            console.log("❌ adminユーザーが見つかりません");
            await connection.end();
            return;
        }

        const user = users[0];
        console.log("✅ adminユーザーが見つかりました:");
        console.log("  ID:", user.id);
        console.log("  ユーザー名:", user.username);
        console.log("  名前:", user.name);
        console.log("  ロール:", user.role);
        console.log("  パスワードハッシュ:", user.password.substring(0, 20) + "...");

        // パスワードを検証
        const testPassword = "admin123";
        console.log("\n🔐 パスワード検証中...");
        console.log("  テストパスワード:", testPassword);

        const isValid = await bcrypt.compare(testPassword, user.password);
        console.log("  検証結果:", isValid ? "✅ 成功" : "❌ 失敗");

        if (!isValid) {
            console.log("\n⚠️  パスワードが一致しません。新しいパスワードを設定します...");
            const newHash = await bcrypt.hash(testPassword, 10);
            await connection.execute(
                "UPDATE users SET password = ? WHERE username = ?",
                [newHash, "admin"]
            );
            console.log("✅ パスワードを更新しました");

            // 再度検証
            const [updatedUsers] = await connection.execute(
                "SELECT password FROM users WHERE username = ?",
                ["admin"]
            );
            const isValidAfter = await bcrypt.compare(testPassword, updatedUsers[0].password);
            console.log("  更新後の検証結果:", isValidAfter ? "✅ 成功" : "❌ 失敗");
        }

        await connection.end();
        console.log("\n✅ テスト完了");
    } catch (error) {
        console.error("❌ エラー:", error.message);
        console.error(error);
    }
}

testLogin();

