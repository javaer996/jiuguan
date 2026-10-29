import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  apiProviders,
  characters,
  chatSessions,
  chatStyles,
  messages,
  outputSchemas,
  personas,
  promptPresets,
  sessionMemories,
  themes,
  worldbookEntries,
  worldbooks,
} from "@/db/schema";
import type {
  CharacterSnapshot,
  ChatStyleSnapshot,
  OutputSchemaSnapshot,
  PersonaSnapshot,
  ThemeSnapshot,
} from "@/db/schema/types";
import { ApiError } from "@/lib/api";
import {
  toCharacterSnapshot,
  toChatMessageDTO,
  toChatSessionDTO,
  toChatStyleSnapshot,
  toOutputSchemaSnapshot,
  toPersonaSnapshot,
  toProviderInfo,
  toThemeSnapshot,
} from "@/lib/chat/serializers";
import {
  findApplicableCompression,
  loadCompressionRows,
  type CompressionRow,
  type MemoryRow,
} from "@/lib/chat/memory";
import { loadTemplateOptions } from "@/lib/content/template-options";
import { resolveProvider } from "@/lib/providers/resolve";
import type { ChatDetailDTO, ChatMessageDTO } from "@/lib/types/chat";

type SessionRow = typeof chatSessions.$inferSelect;
type MessageRow = typeof messages.$inferSelect;
type CharacterRow = typeof characters.$inferSelect;
type StyleRow = typeof chatStyles.$inferSelect;
type SchemaRow = typeof outputSchemas.$inferSelect;
type PresetRow = typeof promptPresets.$inferSelect;
type PersonaRow = typeof personas.$inferSelect;
type ThemeRow = typeof themes.$inferSelect;
type ProviderRow = typeof apiProviders.$inferSelect;
type WorldbookRow = typeof worldbooks.$inferSelect;
type WorldbookEntryRow = typeof worldbookEntries.$inferSelect;

export type ChatContext = {
  session: SessionRow;
  character: CharacterRow | null;
  style: StyleRow | null;
  schema: SchemaRow | null;
  preset: PresetRow | null;
  persona: PersonaRow | null;
  theme: ThemeRow | null;
  provider: ProviderRow | null;
  worldbooks: { book: WorldbookRow; entries: WorldbookEntryRow[] }[];
  allMessages: MessageRow[];
  branch: MessageRow[];
  siblingMap: Map<string, string[]>;
  memories: MemoryRow[];
  compression: CompressionRow | null;
};

const ROOT_KEY = "__root__";

export async function findOwnedSession(id: string, userId: string) {
  const [row] = await getDb()
    .select()
    .from(chatSessions)
    .where(
      and(
        eq(chatSessions.id, id),
        eq(chatSessions.userId, userId),
        isNull(chatSessions.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ApiError(404, "CHAT_NOT_FOUND", "对话不存在或无权访问");
  }
  return row;
}

export function buildBranch(all: MessageRow[], leafId: string | null) {
  const byId = new Map(all.map((message) => [message.id, message]));
  let cursor = leafId && byId.has(leafId) ? leafId : all.at(-1)?.id ?? null;
  const branch: MessageRow[] = [];

  while (cursor) {
    const message = byId.get(cursor);
    if (!message) break;
    branch.push(message);
    cursor = message.parentId;
  }

  return branch.reverse();
}

/** 从指定节点回溯到根，leafId 为 null 时返回空数组。 */
export function branchUpTo(all: MessageRow[], leafId: string | null) {
  const byId = new Map(all.map((message) => [message.id, message]));
  const branch: MessageRow[] = [];
  let cursor = leafId;

  while (cursor) {
    const message = byId.get(cursor);
    if (!message) break;
    branch.push(message);
    cursor = message.parentId;
  }

  return branch.reverse();
}

export function buildSiblingMap(all: MessageRow[]) {
  const groups = new Map<string, MessageRow[]>();
  for (const message of all) {
    const key = message.parentId ?? ROOT_KEY;
    const list = groups.get(key);
    if (list) list.push(message);
    else groups.set(key, [message]);
  }

  const map = new Map<string, string[]>();
  for (const [key, list] of groups) {
    list.sort(
      (a, b) =>
        a.createdAt.getTime() - b.createdAt.getTime() ||
        a.id.localeCompare(b.id),
    );
    map.set(
      key,
      list.map((message) => message.id),
    );
  }
  return map;
}

export function siblingsOf(
  siblingMap: Map<string, string[]>,
  message: MessageRow,
) {
  return siblingMap.get(message.parentId ?? ROOT_KEY) ?? [message.id];
}

export async function loadChatContext(
  session: SessionRow,
): Promise<ChatContext> {
  const db = getDb();
  const worldbookIds = session.worldbookIds ?? [];

  const [
    characterRow,
    styleRow,
    schemaRow,
    presetRow,
    personaRow,
    themeRow,
    defaultThemeRow,
    providerRow,
    allMessages,
    worldbookRows,
    memoryRows,
    compressionRows,
  ] = await Promise.all([
    session.characterId
      ? db
          .select()
          .from(characters)
          .where(
            and(
              eq(characters.id, session.characterId),
              isNull(characters.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    session.chatStyleId
      ? db
          .select()
          .from(chatStyles)
          .where(
            and(
              eq(chatStyles.id, session.chatStyleId),
              isNull(chatStyles.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    session.outputSchemaId
      ? db
          .select()
          .from(outputSchemas)
          .where(
            and(
              eq(outputSchemas.id, session.outputSchemaId),
              isNull(outputSchemas.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    session.promptPresetId
      ? db
          .select()
          .from(promptPresets)
          .where(
            and(
              eq(promptPresets.id, session.promptPresetId),
              isNull(promptPresets.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    session.personaId
      ? db
          .select()
          .from(personas)
          .where(
            and(
              eq(personas.id, session.personaId),
              isNull(personas.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    session.themeId
      ? db
          .select()
          .from(themes)
          .where(
            and(
              eq(themes.id, session.themeId),
              eq(themes.userId, session.userId),
              isNull(themes.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    db
      .select()
      .from(themes)
      .where(
        and(
          eq(themes.userId, session.userId),
          eq(themes.isDefault, true),
          isNull(themes.deletedAt),
        ),
      )
      .orderBy(desc(themes.updatedAt))
      .limit(1),
    resolveProvider(session.userId, session.providerId).then(
      async (provider) =>
        provider ?? (await resolveProvider(session.userId)),
    ),
    db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, session.id))
      .orderBy(messages.createdAt),
    worldbookIds.length > 0
      ? db
          .select()
          .from(worldbooks)
          .where(
            and(
              inArray(worldbooks.id, worldbookIds),
              isNull(worldbooks.deletedAt),
            ),
          )
      : Promise.resolve([]),
    db
      .select()
      .from(sessionMemories)
      .where(
        and(
          eq(sessionMemories.sessionId, session.id),
          eq(sessionMemories.enabled, true),
        ),
      )
      .orderBy(desc(sessionMemories.importance), desc(sessionMemories.updatedAt))
      .limit(100),
    loadCompressionRows(session.id),
  ]);

  const bookIds = worldbookRows.map((book) => book.id);
  const entryRows =
    bookIds.length > 0
      ? await db
          .select()
          .from(worldbookEntries)
          .where(inArray(worldbookEntries.worldbookId, bookIds))
          .orderBy(worldbookEntries.sortOrder, worldbookEntries.createdAt)
      : [];

  const entriesByBook = new Map<string, WorldbookEntryRow[]>();
  for (const entry of entryRows) {
    const list = entriesByBook.get(entry.worldbookId);
    if (list) list.push(entry);
    else entriesByBook.set(entry.worldbookId, [entry]);
  }

  const branch = buildBranch(allMessages, session.activeLeafId);
  const siblingMap = buildSiblingMap(allMessages);
  const branchLeafId = branch.at(-1)?.id ?? session.activeLeafId;

  return {
    session,
    character: characterRow[0] ?? null,
    style: styleRow[0] ?? null,
    schema: schemaRow[0] ?? null,
    preset: presetRow[0] ?? null,
    persona: personaRow[0] ?? null,
    theme: themeRow[0] ?? defaultThemeRow[0] ?? null,
    provider: providerRow,
    worldbooks: worldbookRows.map((book) => ({
      book,
      entries: entriesByBook.get(book.id) ?? [],
    })),
    allMessages,
    branch,
    siblingMap,
    memories: memoryRows,
    compression: findApplicableCompression(
      compressionRows,
      branchLeafId,
      allMessages,
    ),
  };
}

export function annotateBranch(
  context: ChatContext,
  branch: MessageRow[] = context.branch,
): ChatMessageDTO[] {
  return branch.map((message) =>
    toChatMessageDTO(message, siblingsOf(context.siblingMap, message)),
  );
}

export function snapshotResources(context: ChatContext): {
  character: CharacterSnapshot | null;
  style: ChatStyleSnapshot | null;
  theme: ThemeSnapshot | null;
  schema: OutputSchemaSnapshot | null;
  persona: PersonaSnapshot | null;
} {
  return {
    character: context.character
      ? toCharacterSnapshot(context.character)
      : null,
    style: context.style ? toChatStyleSnapshot(context.style) : null,
    theme: context.theme ? toThemeSnapshot(context.theme) : null,
    schema: context.schema ? toOutputSchemaSnapshot(context.schema) : null,
    persona: context.persona ? toPersonaSnapshot(context.persona) : null,
  };
}

export async function toChatDetailDTO(
  context: ChatContext,
): Promise<ChatDetailDTO> {
  const options = await loadTemplateOptions(context.session.userId);
  const resources = snapshotResources(context);

  return {
    session: toChatSessionDTO(context.session, {
      characterName: context.character?.name ?? null,
      characterAvatar: context.character?.avatarUrl ?? null,
    }),
    messages: annotateBranch(context),
    character: resources.character,
    style: resources.style,
    theme: resources.theme,
    schema: resources.schema,
    persona: resources.persona,
    provider: context.provider ? toProviderInfo(context.provider) : null,
    options,
  };
}
