import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

const LOCK_NAME = "jiuguan_migrate";

function parseDatabaseUrl(url: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("DATABASE_URL 格式不正确");
  }

  let name: string;
  try {
    name = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
  } catch {
    throw new Error("DATABASE_URL 中的数据库名编码不正确");
  }

  if (!name || name.includes("/")) {
    throw new Error(
      "DATABASE_URL 必须包含数据库名，例如 mysql://user:<password>@host:3306/jiuguan",
    );
  }

  // 连接 MySQL 服务时不指定数据库，用于检查并创建目标库。
  parsed.pathname = "/";
  return { name, serverUrl: parsed.toString() };
}

async function ensureDatabase(url: string) {
  const { name, serverUrl } = parseDatabaseUrl(url);

  // 先直接连目标库：能连上说明库已存在，避免对没有 CREATE 权限的用户误报。
  try {
    const connection = await mysql.createConnection({
      uri: url,
      charset: "utf8mb4",
      timezone: "Z",
    });
    await connection.end();
    return;
  } catch (error) {
    if ((error as { code?: string }).code !== "ER_BAD_DB_ERROR") throw error;
  }

  // 库不存在，改连 MySQL 服务创建。
  const server = await mysql.createConnection({
    uri: serverUrl,
    charset: "utf8mb4",
    timezone: "Z",
  });

  try {
    await server.query(
      "CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET utf8mb4",
      [name],
    );
    console.log(`[migrate] 数据库 ${name} 不存在，已自动创建`);
  } catch (error) {
    console.error(
      `[migrate] 自动创建数据库 ${name} 失败：请先手动创建数据库，或给数据库用户授予 CREATE 权限`,
    );
    throw error;
  } finally {
    await server.end();
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("缺少 DATABASE_URL 环境变量");

  await ensureDatabase(url);

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
