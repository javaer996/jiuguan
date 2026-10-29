import mysql from "mysql2/promise";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as schema from "./schema";

type Database = MySql2Database<typeof schema>;

const globalForDb = globalThis as unknown as {
  jiuguanPool?: mysql.Pool;
  jiuguanDb?: Database;
};

function createPool(): mysql.Pool {
  const uri = process.env.DATABASE_URL;
  if (!uri) {
    throw new Error("缺少 DATABASE_URL 环境变量");
  }

  const poolSize = Number(process.env.DB_POOL_SIZE ?? 10);
  const pool = mysql.createPool({
    uri,
    waitForConnections: true,
    connectionLimit: poolSize,
    maxIdle: poolSize,
    idleTimeout: 60_000,
    queueLimit: 0,
    charset: "utf8mb4",
    // 数据库中的 datetime 统一按 UTC 读写，避免容器时区差异导致时间偏移
    timezone: "Z",
    supportBigNumbers: true,
  });

  // 新建连接时把会话时区固定为 UTC，使 CURRENT_TIMESTAMP 与应用写入一致
  pool.on("connection", (connection) => {
    connection.query("SET time_zone = '+00:00'");
  });

  return pool;
}

/**
 * 惰性获取数据库实例：构建阶段不会建立连接，运行时复用同一个连接池。
 */
export function getDb(): Database {
  if (!globalForDb.jiuguanDb) {
    const pool = (globalForDb.jiuguanPool ??= createPool());
    globalForDb.jiuguanDb = drizzle(pool, { schema, mode: "default" });
  }
  return globalForDb.jiuguanDb;
}

/** 脚本结束时释放连接池，避免 tsx 进程挂起。 */
export async function closeDb(): Promise<void> {
  if (globalForDb.jiuguanPool) {
    await globalForDb.jiuguanPool.end();
    globalForDb.jiuguanPool = undefined;
    globalForDb.jiuguanDb = undefined;
  }
}

export { schema };
export type { Database };
