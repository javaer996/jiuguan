import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { characters, chatSessions } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import {
  findOwnedSession,
  loadChatContext,
  toChatDetailDTO,
} from "@/lib/chat/context";
import { clearDebugSnapshot } from "@/lib/chat/debug";
import { toChatSessionDTO } from "@/lib/chat/serializers";
import { assertTemplateRefs } from "@/lib/content/refs";
import { resolveProvider } from "@/lib/providers/resolve";
import { chatUpdateSchema } from "@/lib/validation/chat";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const session = await findOwnedSession(id, context.user.id);
    const chatContext = await loadChatContext(session);
    return jsonOk(await toChatDetailDTO(chatContext));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    const session = await findOwnedSession(id, context.user.id);
    const input = await readJson(request, chatUpdateSchema);

    if (input.settings?.debugMode === true && context.user.role !== "admin") {
      throw new ApiError(403, "FORBIDDEN", "只有管理员可以开启调试模式");
    }

    const nextSettings =
      input.settings === undefined
        ? undefined
        : input.settings === null
          ? null
          : {
              ...input.settings,
              ...(context.user.role !== "admin" ? { debugMode: false } : {}),
            };
    const previousDebug = session.settings?.debugMode === true;
    const nextDebug = nextSettings?.debugMode === true;
    if (input.settings !== undefined && previousDebug !== nextDebug) {
      clearDebugSnapshot(session.id);
    }

    const worldbookIds =
      input.worldbookIds === undefined
        ? undefined
        : input.worldbookIds ?? [];

    await assertTemplateRefs(context.user.id, {
      promptPresetId:
        input.promptPresetId === undefined
          ? undefined
          : input.promptPresetId,
      chatStyleId:
        input.chatStyleId === undefined ? undefined : input.chatStyleId,
      themeId: input.themeId === undefined ? undefined : input.themeId,
      outputSchemaId:
        input.outputSchemaId === undefined ? undefined : input.outputSchemaId,
      personaId: input.personaId === undefined ? undefined : input.personaId,
      worldbookIds,
    });

    let providerId = session.providerId;
    let providerModel: string | undefined;
    if (input.providerId !== undefined) {
      if (input.providerId === null) {
        providerId = null;
      } else {
        const provider = await resolveProvider(
          context.user.id,
          input.providerId,
        );
        if (!provider) {
          throw new ApiError(
            400,
            "INVALID_PROVIDER",
            "指定的 AI 供应商不存在、已停用或未授权",
          );
        }
        providerId = provider.id;
        providerModel = provider.model;
      }
    }

    await getDb()
      .update(chatSessions)
      .set({
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.pinned !== undefined ? { pinned: input.pinned } : {}),
        ...(input.archived !== undefined ? { archived: input.archived } : {}),
        ...(input.model !== undefined
          ? { model: input.model }
          : providerModel !== undefined
            ? { model: providerModel }
            : {}),
        providerId,
        ...(input.promptPresetId !== undefined
          ? { promptPresetId: input.promptPresetId }
          : {}),
        ...(input.chatStyleId !== undefined
          ? { chatStyleId: input.chatStyleId }
          : {}),
        ...(input.themeId !== undefined ? { themeId: input.themeId } : {}),
        ...(input.outputSchemaId !== undefined
          ? { outputSchemaId: input.outputSchemaId }
          : {}),
        ...(input.personaId !== undefined
          ? { personaId: input.personaId }
          : {}),
        ...(worldbookIds !== undefined ? { worldbookIds } : {}),
        ...(nextSettings !== undefined ? { settings: nextSettings } : {}),
      })
      .where(
        and(
          eq(chatSessions.id, id),
          eq(chatSessions.userId, context.user.id),
        ),
      );

    const [row] = await getDb()
      .select({
        session: chatSessions,
        characterName: characters.name,
        characterAvatar: characters.avatarUrl,
      })
      .from(chatSessions)
      .leftJoin(characters, eq(characters.id, chatSessions.characterId))
      .where(eq(chatSessions.id, id))
      .limit(1);

    if (!row) throw new ApiError(404, "CHAT_NOT_FOUND", "对话不存在");

    return jsonOk({
      session: toChatSessionDTO(row.session, {
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
    await findOwnedSession(id, context.user.id);
    clearDebugSnapshot(id);

    await getDb()
      .update(chatSessions)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(chatSessions.id, id),
          eq(chatSessions.userId, context.user.id),
          isNull(chatSessions.deletedAt),
        ),
      );

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
