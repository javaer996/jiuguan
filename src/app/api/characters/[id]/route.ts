import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { characters } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { toCharacterDTO } from "@/lib/content/serializers";
import { characterInputSchema } from "@/lib/validation/content";

type RouteParams = { params: Promise<{ id: string }> };

async function findOwned(id: string, userId: string) {
  const [row] = await getDb()
    .select()
    .from(characters)
    .where(
      and(
        eq(characters.id, id),
        eq(characters.userId, userId),
        isNull(characters.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ApiError(404, "CHARACTER_NOT_FOUND", "角色不存在或无权访问");
  }
  return row;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const row = await findOwned(id, context.user.id);
    return jsonOk({ character: toCharacterDTO(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    await findOwned(id, context.user.id);

    const input = await readJson(request, characterInputSchema);
    await getDb()
      .update(characters)
      .set({ ...input, source: input.source ?? "manual" })
      .where(
        and(eq(characters.id, id), eq(characters.userId, context.user.id)),
      );

    const row = await findOwned(id, context.user.id);
    return jsonOk({ character: toCharacterDTO(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    await findOwned(id, context.user.id);

    await getDb()
      .update(characters)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(characters.id, id), eq(characters.userId, context.user.id)),
      );

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
