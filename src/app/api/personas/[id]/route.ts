import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { personas } from "@/db/schema";
import {
  ApiError,
  handleApiError,
  jsonOk,
  readJson,
} from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { personaInputSchema } from "@/lib/validation/content";

type RouteParams = { params: Promise<{ id: string }> };

async function findOwned(id: string, userId: string) {
  const [row] = await getDb()
    .select()
    .from(personas)
    .where(
      and(
        eq(personas.id, id),
        eq(personas.userId, userId),
        isNull(personas.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ApiError(
      404,
      "PERSONA_NOT_FOUND",
      "用户身份不存在或无权访问",
    );
  }
  return row;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const row = await findOwned(id, context.user.id);
    return jsonOk({
      persona: {
        id: row.id,
        name: row.name,
        description: row.description,
        avatarUrl: row.avatarUrl,
        isDefault: row.isDefault,
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
    const current = await findOwned(id, context.user.id);
    const input = await readJson(request, personaInputSchema.partial());
    const name = input.name ?? current.name;
    const description =
      input.description === undefined
        ? undefined
        : input.description?.trim()
          ? input.description
              .trim()
              .replace(/\{\{\s*user\s*\}\}/gi, name)
          : null;

    const db = getDb();
    await db.transaction(async (tx) => {
      if (input.isDefault === true) {
        await tx
          .update(personas)
          .set({ isDefault: false })
          .where(
            and(
              eq(personas.userId, context.user.id),
              isNull(personas.deletedAt),
            ),
          );
      }

      await tx
        .update(personas)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.avatarUrl !== undefined
            ? { avatarUrl: input.avatarUrl ?? null }
            : {}),
          ...(description !== undefined ? { description } : {}),
          ...(input.isDefault !== undefined
            ? { isDefault: input.isDefault }
            : {}),
        })
        .where(
          and(
            eq(personas.id, id),
            eq(personas.userId, context.user.id),
            isNull(personas.deletedAt),
          ),
        );
    });

    const row = await findOwned(id, context.user.id);
    return jsonOk({
      persona: {
        id: row.id,
        name: row.name,
        description: row.description,
        avatarUrl: row.avatarUrl,
        isDefault: row.isDefault,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
