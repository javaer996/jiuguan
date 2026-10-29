import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { jsonError, jsonOk } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await getDb().execute(sql`SELECT 1`);
    return jsonOk({
      status: "ok",
      time: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[health] 数据库检查失败", error);
    return jsonError(503, "DB_UNAVAILABLE", "数据库暂不可用");
  }
}
