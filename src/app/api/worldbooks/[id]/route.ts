import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { worldbookEntries, worldbooks } from "@/db/schema";
import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import {
  toWorldbookDTO,
  toWorldbookEntryDTO,
} from "@/lib/content/serializers";
import { getOwnedWorldbook } from "@/lib/content/worldbooks";
import { worldbookInputSchema } from "@/lib/validation/content";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const worldbook = await getOwnedWorldbook(id, context.user.id);

    const entries = await getDb()
      .select()
      .from(worldbookEntries)
      .where(eq(worldbookEntries.worldbookId, id))
      .orderBy(asc(worldbookEntries.sortOrder), asc(worldbookEntries.name));

    return jsonOk({
      worldbook: {
        ...toWorldbookDTO(worldbook, entries.length),
        entries: entries.map(toWorldbookEntryDTO),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    await getOwnedWorldbook(id, context.user.id);

    const input = await readJson(request, worldbookInputSchema);
    await getDb()
      .update(worldbooks)
      .set(input)
      .where(
        and(eq(worldbooks.id, id), eq(worldbooks.userId, context.user.id)),
      );

    const row = await getOwnedWorldbook(id, context.user.id);
    return jsonOk({ worldbook: toWorldbookDTO(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    await getOwnedWorldbook(id, context.user.id);

    await getDb()
      .update(worldbooks)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(worldbooks.id, id),
          eq(worldbooks.userId, context.user.id),
          isNull(worldbooks.deletedAt),
        ),
      );

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
