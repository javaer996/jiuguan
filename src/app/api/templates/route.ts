import { and, desc, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { characters, chatTemplates } from "@/db/schema";
import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { parseLimit } from "@/lib/content/query";
import { stripDebugMode } from "@/lib/chat/settings";
import { assertTemplateRefs } from "@/lib/content/refs";
import { toChatTemplateDTO } from "@/lib/content/serializers";
import { chatTemplateInputSchema } from "@/lib/validation/content";

export async function GET(request: Request) {
  try {
    const context = await requireUser();
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"), 100, 200);

    const rows = await getDb()
      .select({
        template: chatTemplates,
        characterName: characters.name,
        characterAvatar: characters.avatarUrl,
      })
      .from(chatTemplates)
      .leftJoin(characters, eq(characters.id, chatTemplates.characterId))
      .where(
        and(
          eq(chatTemplates.userId, context.user.id),
          isNull(chatTemplates.deletedAt),
        ),
      )
      .orderBy(desc(chatTemplates.updatedAt))
      .limit(limit);

    return jsonOk({
      templates: rows.map((row) =>
        toChatTemplateDTO(row.template, {
          characterName: row.characterName,
          characterAvatar: row.characterAvatar,
        }),
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
    const input = await readJson(request, chatTemplateInputSchema);

    await assertTemplateRefs(context.user.id, input);

    const id = uuidv7();
    await getDb()
      .insert(chatTemplates)
      .values({
        id,
        userId: context.user.id,
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
      });

    const [row] = await getDb()
      .select()
      .from(chatTemplates)
      .where(eq(chatTemplates.id, id))
      .limit(1);

    if (!row) throw new Error("模板创建失败");

    return jsonOk({ template: toChatTemplateDTO(row) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
