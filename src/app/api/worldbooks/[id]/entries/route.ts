import { eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { worldbookEntries } from "@/db/schema";
import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { toWorldbookEntryDTO } from "@/lib/content/serializers";
import { getOwnedWorldbook } from "@/lib/content/worldbooks";
import { worldbookEntryInputSchema } from "@/lib/validation/content";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    await getOwnedWorldbook(id, context.user.id);

    const input = await readJson(request, worldbookEntryInputSchema);
    const entryId = uuidv7();

    await getDb()
      .insert(worldbookEntries)
      .values({
        id: entryId,
        worldbookId: id,
        ...input,
        content: input.content ?? "",
      });

    const [row] = await getDb()
      .select()
      .from(worldbookEntries)
      .where(eq(worldbookEntries.id, entryId))
      .limit(1);

    if (!row) throw new Error("条目创建失败");

    return jsonOk({ entry: toWorldbookEntryDTO(row) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
