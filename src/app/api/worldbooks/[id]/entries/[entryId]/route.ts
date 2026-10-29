import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { worldbookEntries } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { toWorldbookEntryDTO } from "@/lib/content/serializers";
import { getOwnedWorldbook } from "@/lib/content/worldbooks";
import { worldbookEntryInputSchema } from "@/lib/validation/content";

type RouteParams = { params: Promise<{ id: string; entryId: string }> };

async function findEntry(worldbookId: string, entryId: string) {
  const [row] = await getDb()
    .select()
    .from(worldbookEntries)
    .where(
      and(
        eq(worldbookEntries.id, entryId),
        eq(worldbookEntries.worldbookId, worldbookId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ApiError(404, "ENTRY_NOT_FOUND", "世界书条目不存在");
  }
  return row;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id, entryId } = await params;
    await getOwnedWorldbook(id, context.user.id);
    await findEntry(id, entryId);

    const input = await readJson(request, worldbookEntryInputSchema);
    await getDb()
      .update(worldbookEntries)
      .set({ ...input, content: input.content ?? "" })
      .where(eq(worldbookEntries.id, entryId));

    const row = await findEntry(id, entryId);
    return jsonOk({ entry: toWorldbookEntryDTO(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id, entryId } = await params;
    await getOwnedWorldbook(id, context.user.id);
    await findEntry(id, entryId);

    await getDb()
      .delete(worldbookEntries)
      .where(eq(worldbookEntries.id, entryId));

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
