import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const LOCK_NAME = "jiuguan_migrate";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("缺少 DATABASE_URL 环境变量");

  const connection = await mysql.createConnection({
    uri: url,
    charset: "utf8mb4",
    timezone: "Z",
  });

  try {
    await connection.query("SET time_zone = '+00:00'");

    const [lockRows] = await connection.query(
      "SELECT GET_LOCK(?, 60) AS locked",
      [LOCK_NAME],
    );
    const locked = (lockRows as { locked: number | null }[])[0]?.locked;
    if (locked !== 1) {
      throw new Error("等待数据库迁移锁超时，可能有其他实例正在迁移");
    }

    const db = drizzle(connection, { mode: "default" });
    await migrate(db, { migrationsFolder: "drizzle" });
    console.log("[migrate] 数据库迁移完成");
  } finally {
    try {
      await connection.query("SELECT RELEASE_LOCK(?)", [LOCK_NAME]);
    } catch {
      // 连接已断开时锁会自动释放
    }
    await connection.end();
  }
}

main().catch((error) => {
  console.error("[migrate] 迁移失败", error);
  process.exit(1);
});
