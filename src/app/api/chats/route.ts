import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import {
  characters,
  chatSessions,
  chatTemplates,
  messages,
  outputSchemas,
  personas,
  promptPresets,
  themes,
} from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { toChatSessionDTO } from "@/lib/chat/serializers";
import { stripDebugMode } from "@/lib/chat/settings";
import { parseLimit } from "@/lib/content/query";
import { assertTemplateRefs } from "@/lib/content/refs";
import { resolveProvider } from "@/lib/providers/resolve";
import { chatCreateSchema } from "@/lib/validation/chat";

export async function GET(request: Request) {
  try {
    const context = await requireUser();
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"), 60, 200);
    const archived = url.searchParams.get("archived") === "1";

    const rows = await getDb()
      .select({
        session: chatSessions,
        characterName: characters.name,
        characterAvatar: characters.avatarUrl,
      })
      .from(chatSessions)
      .leftJoin(characters, eq(characters.id, chatSessions.characterId))
      .where(
        and(
          eq(chatSessions.userId, context.user.id),
          isNull(chatSessions.deletedAt),
          eq(chatSessions.archived, archived),
        ),
      )
      .orderBy(desc(chatSessions.pinned), desc(chatSessions.updatedAt))
      .limit(limit);

    return jsonOk({
      sessions: rows.map((row) =>
        toChatSessionDTO(row.session, {
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
    const input = await readJson(request, chatCreateSchema);

    if (input.settings?.debugMode === true && context.user.role !== "admin") {
      throw new ApiError(403, "FORBIDDEN", "只有管理员可以开启调试模式");
    }

    const db = getDb();
    let template = null;

    if (input.templateId) {
      const [row] = await db
        .select()
        .from(chatTemplates)
        .where(
          and(
            eq(chatTemplates.id, input.templateId),
            eq(chatTemplates.userId, context.user.id),
            isNull(chatTemplates.deletedAt),
          ),
        )
        .limit(1);

      if (!row) {
        throw new ApiError(404, "TEMPLATE_NOT_FOUND", "对话模板不存在或无权访问");
      }
      template = row;
    }

    const characterId = input.characterId ?? template?.characterId ?? null;
    const worldbookIds = input.worldbookIds ?? template?.worldbookIds ?? [];
    const requestedProviderId =
      input.providerId ?? template?.providerId ?? null;

    const [defaultPrompt, defaultSchema, defaultPersona, defaultTheme] =
      await Promise.all([
      db
        .select({ id: promptPresets.id })
        .from(promptPresets)
        .where(
          and(
            eq(promptPresets.userId, context.user.id),
            eq(promptPresets.isDefault, true),
            isNull(promptPresets.deletedAt),
          ),
        )
        .limit(1),
      db
        .select({ id: outputSchemas.id })
        .from(outputSchemas)
        .where(
          and(
            eq(outputSchemas.userId, context.user.id),
            eq(outputSchemas.isDefault, true),
            isNull(outputSchemas.deletedAt),
          ),
        )
        .limit(1),
      db
        .select({ id: personas.id })
        .from(personas)
        .where(
          and(
            eq(personas.userId, context.user.id),
            eq(personas.isDefault, true),
            isNull(personas.deletedAt),
          ),
        )
        .limit(1),
      db
        .select({ id: themes.id })
        .from(themes)
        .where(
          and(
            eq(themes.userId, context.user.id),
            eq(themes.isDefault, true),
            isNull(themes.deletedAt),
          ),
        )
        .limit(1),
    ]);

    const promptPresetId =
      input.promptPresetId ??
      template?.promptPresetId ??
      defaultPrompt[0]?.id ??
      null;
    const chatStyleId = input.chatStyleId ?? template?.chatStyleId ?? null;
    const themeId =
      input.themeId ?? template?.themeId ?? defaultTheme[0]?.id ?? null;
    const outputSchemaId =
      input.outputSchemaId ??
      template?.outputSchemaId ??
      defaultSchema[0]?.id ??
      null;
    const personaId =
      input.personaId ??
      template?.personaId ??
      defaultPersona[0]?.id ??
      null;

    await assertTemplateRefs(context.user.id, {
      characterId,
      promptPresetId,
      chatStyleId,
      themeId,
      outputSchemaId,
      personaId,
      worldbookIds,
    });

    const provider = await resolveProvider(
      context.user.id,
      requestedProviderId,
    );
    if (requestedProviderId && !provider) {
      throw new ApiError(
        400,
        "INVALID_PROVIDER",
        "指定的 AI 供应商不存在、已停用或未授权",
      );
    }

    let character = null;
    if (characterId) {
      const [row] = await db
        .select()
        .from(characters)
        .where(
          and(
            eq(characters.id, characterId),
            isNull(characters.deletedAt),
          ),
        )
        .limit(1);
      character = row ?? null;
    }

    const greetingIndex =
      input.greetingIndex ?? template?.greetingIndex ?? 0;
    const greetings = [
      character?.firstMessage,
      ...(character?.alternateGreetings ?? []),
    ].filter((item): item is string => Boolean(item && item.trim()));
    const greeting =
      greetings.length > 0
        ? greetings[Math.min(greetingIndex, greetings.length - 1)]!
        : null;

    const settings = {
      ...(stripDebugMode(template?.settings) ?? {}),
      ...(input.settings ?? {}),
    };

    const sessionId = uuidv7();
    const title =
      input.title?.trim() ||
      template?.name ||
      character?.name ||
      "新的对话";

    await db.transaction(async (tx) => {
      await tx.insert(chatSessions).values({
        id: sessionId,
        userId: context.user.id,
        title,
        characterId,
        templateId: template?.id ?? null,
        providerId: provider?.id ?? null,
        chatStyleId,
        themeId,
        promptPresetId,
        personaId,
        outputSchemaId,
        worldbookIds,
        model: provider?.model ?? null,
        settings: Object.keys(settings).length > 0 ? settings : null,
      });

      if (greeting) {
        const greetingId = uuidv7();
        await tx.insert(messages).values({
          id: greetingId,
          sessionId,
          role: "assistant",
          content: greeting,
          status: "complete",
          metadata: {
            model: provider?.model,
            greeting: true,
          },
        });

        await tx
          .update(chatSessions)
          .set({
            activeLeafId: greetingId,
            messageCount: 1,
            lastMessageAt: new Date(),
          })
          .where(eq(chatSessions.id, sessionId));
      }

      if (template) {
        await tx
          .update(chatTemplates)
          .set({ usageCount: sql`${chatTemplates.usageCount} + 1` })
          .where(eq(chatTemplates.id, template.id));
      }
    });

    const [sessionRow] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, sessionId))
      .limit(1);

    if (!sessionRow) throw new Error("对话创建失败");

    return jsonOk(
      {
        session: toChatSessionDTO(sessionRow, {
          characterName: character?.name ?? null,
          characterAvatar: character?.avatarUrl ?? null,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
