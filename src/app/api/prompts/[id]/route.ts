import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { promptPresets } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { toPromptPresetDTO } from "@/lib/content/serializers";
import { promptPresetInputSchema } from "@/lib/validation/content";

type RouteParams = { params: Promise<{ id: string }> };

async function findOwned(id: string, userId: string) {
  const [row] = await getDb()
    .select()
    .from(promptPresets)
    .where(
      and(
        eq(promptPresets.id, id),
        eq(promptPresets.userId, userId),
        isNull(promptPresets.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ApiError(404, "PROMPT_NOT_FOUND", "提示词预设不存在或无权访问");
  }
  return row;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const row = await findOwned(id, context.user.id);
    return jsonOk({ preset: toPromptPresetDTO(row) });
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

    const input = await readJson(request, promptPresetInputSchema);
    const isDefault = input.isDefault ?? false;

    await getDb().transaction(async (tx) => {
      if (isDefault) {
        await tx
          .update(promptPresets)
          .set({ isDefault: false })
          .where(eq(promptPresets.userId, context.user.id));
      }

      await tx
        .update(promptPresets)
        .set({
          name: input.name,
          description: input.description ?? null,
          systemPrompt: input.systemPrompt ?? null,
          postHistoryInstructions: input.postHistoryInstructions ?? null,
          blocks: input.blocks ?? null,
          variables: input.variables ?? null,
          isDefault,
        })
        .where(
          and(
            eq(promptPresets.id, id),
            eq(promptPresets.userId, context.user.id),
          ),
        );
    });

    const row = await findOwned(id, context.user.id);
    return jsonOk({ preset: toPromptPresetDTO(row) });
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
      .update(promptPresets)
      .set({ deletedAt: new Date(), isDefault: false })
      .where(
        and(
          eq(promptPresets.id, id),
          eq(promptPresets.userId, context.user.id),
        ),
      );

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
