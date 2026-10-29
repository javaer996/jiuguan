import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { worldbookEntries, worldbooks } from "@/db/schema";
import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { likePattern, parseLimit } from "@/lib/content/query";
import { toWorldbookDTO } from "@/lib/content/serializers";
import { worldbookInputSchema } from "@/lib/validation/content";

export async function GET(request: Request) {
  try {
    const context = await requireUser();
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    const limit = parseLimit(url.searchParams.get("limit"), 60, 200);

    const conditions = [
      eq(worldbooks.userId, context.user.id),
      isNull(worldbooks.deletedAt),
    ];

    if (query) {
      const pattern = likePattern(query);
      const search = or(
        like(worldbooks.name, pattern),
        like(worldbooks.description, pattern),
      );
      if (search) conditions.push(search);
    }

    const entryCount = sql<number>`(
      SELECT COUNT(*) FROM ${worldbookEntries}
      WHERE ${worldbookEntries.worldbookId} = ${worldbooks.id}
    )`;

    const rows = await getDb()
      .select({
        worldbook: worldbooks,
        entryCount,
      })
      .from(worldbooks)
      .where(and(...conditions))
      .orderBy(desc(worldbooks.updatedAt))
      .limit(limit);

    return jsonOk({
      worldbooks: rows.map((row) =>
        toWorldbookDTO(row.worldbook, Number(row.entryCount)),
      ),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, worldbookInputSchema);

    const id = uuidv7();
    await getDb()
      .insert(worldbooks)
      .values({ id, userId: context.user.id, ...input });

    const [row] = await getDb()
      .select()
      .from(worldbooks)
      .where(eq(worldbooks.id, id))
      .limit(1);

    if (!row) throw new Error("世界书创建失败");

    return jsonOk({ worldbook: toWorldbookDTO(row, 0) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
