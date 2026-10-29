import { and, desc, eq, isNull, like, or } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { characters } from "@/db/schema";
import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { likePattern, parseLimit } from "@/lib/content/query";
import {
  toCharacterDTO,
  toCharacterListItem,
} from "@/lib/content/serializers";
import { characterInputSchema } from "@/lib/validation/content";

export async function GET(request: Request) {
  try {
    const context = await requireUser();
    const url = new URL(request.url);
    const query = url.searchParams.get("q")?.trim();
    const limit = parseLimit(url.searchParams.get("limit"), 60, 200);

    const conditions = [
      eq(characters.userId, context.user.id),
      isNull(characters.deletedAt),
    ];

    if (query) {
      const pattern = likePattern(query);
      const search = or(
        like(characters.name, pattern),
        like(characters.tagline, pattern),
      );
      if (search) conditions.push(search);
    }

    const rows = await getDb()
      .select()
      .from(characters)
      .where(and(...conditions))
      .orderBy(desc(characters.updatedAt))
      .limit(limit);

    return jsonOk({ characters: rows.map(toCharacterListItem) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, characterInputSchema);

    const id = uuidv7();
    await getDb()
      .insert(characters)
      .values({
        id,
        userId: context.user.id,
        ...input,
        source: input.source ?? "manual",
      });

    const [row] = await getDb()
      .select()
      .from(characters)
      .where(eq(characters.id, id))
      .limit(1);

    if (!row) throw new Error("角色创建失败");

    return jsonOk({ character: toCharacterDTO(row) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
