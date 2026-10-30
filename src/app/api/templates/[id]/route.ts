import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { characters, chatTemplates } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { stripDebugMode } from "@/lib/chat/settings";
import { assertTemplateRefs } from "@/lib/content/refs";
import { toChatTemplateDTO } from "@/lib/content/serializers";
import { chatTemplateInputSchema } from "@/lib/validation/content";

type RouteParams = { params: Promise<{ id: string }> };

async function findOwned(id: string, userId: string) {
  const [row] = await getDb()
    .select({
      template: chatTemplates,
      characterName: characters.name,
      characterAvatar: characters.avatarUrl,
    })
    .from(chatTemplates)
    .leftJoin(characters, eq(characters.id, chatTemplates.characterId))
    .where(
      and(
        eq(chatTemplates.id, id),
        eq(chatTemplates.userId, userId),
        isNull(chatTemplates.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ApiError(404, "TEMPLATE_NOT_FOUND", "对话模板不存在或无权访问");
  }
  return row;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const row = await findOwned(id, context.user.id);
    return jsonOk({
      template: toChatTemplateDTO(row.template, {
        characterName: row.characterName,
        characterAvatar: row.characterAvatar,
      }),
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
    await findOwned(id, context.user.id);

    const input = await readJson(request, chatTemplateInputSchema);
    await assertTemplateRefs(context.user.id, input);

    await getDb()
      .update(chatTemplates)
      .set({
        name: input.name,
        description: input.description ?? null,
        coverUrl: input.coverUrl ?? null,
        characterId: input.characterId ?? null,
        worldbookIds: input.worldbookIds ?? null,
        promptPresetId: input.promptPresetId ?? null,
        chatStyleId: input.chatStyleId ?? null,
        themeId: input.themeId ?? null,
        outputSchemaId: input.outputSchemaId ?? null,
        personaId: input.personaId ?? null,
        providerId: input.providerId ?? null,
        settings: stripDebugMode(
          input.settings,
        ) as typeof chatTemplates.$inferInsert.settings,
        greetingIndex: input.greetingIndex ?? 0,
      })
      .where(
        and(
          eq(chatTemplates.id, id),
          eq(chatTemplates.userId, context.user.id),
        ),
      );

    const row = await findOwned(id, context.user.id);
    return jsonOk({
      template: toChatTemplateDTO(row.template, {
        characterName: row.characterName,
        characterAvatar: row.characterAvatar,
      }),
    });
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
      .update(chatTemplates)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(chatTemplates.id, id),
          eq(chatTemplates.userId, context.user.id),
        ),
      );

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
