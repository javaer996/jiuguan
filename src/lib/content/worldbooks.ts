import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { worldbooks } from "@/db/schema";
import { ApiError } from "@/lib/api";

export async function getOwnedWorldbook(id: string, userId: string) {
  const [row] = await getDb()
    .select()
    .from(worldbooks)
    .where(
      and(
        eq(worldbooks.id, id),
        eq(worldbooks.userId, userId),
        isNull(worldbooks.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ApiError(404, "WORLDBOOK_NOT_FOUND", "世界书不存在或无权访问");
  }
  return row;
}
