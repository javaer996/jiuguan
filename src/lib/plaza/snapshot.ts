import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  characters,
  chatStyles,
  chatTemplates,
  outputSchemas,
  personas,
  promptPresets,
  themes,
  worldbooks,
  worldbookEntries,
} from "@/db/schema";
import type {
  PromptPresetSnapshot,
  TemplateSnapshot,
  ThemeSnapshot,
  WorldbookSnapshot,
} from "@/db/schema/types";
import { ApiError } from "@/lib/api";
import {
  toCharacterSnapshot,
  toChatStyleSnapshot,
  toOutputSchemaSnapshot,
  toPersonaSnapshot,
} from "@/lib/chat/serializers";

type TemplateRow = typeof chatTemplates.$inferSelect;
type WorldbookRow = typeof worldbooks.$inferSelect;
type WorldbookEntryRow = typeof worldbookEntries.$inferSelect;

function toWorldbookSnapshot(
  book: WorldbookRow,
  entries: WorldbookEntryRow[],
): WorldbookSnapshot {
  return {
    name: book.name,
    description: book.description,
    scanDepth: book.scanDepth,
    tokenBudget: book.tokenBudget,
    recursive: book.recursive,
    maxRecursionDepth: book.maxRecursionDepth,
    caseSensitive: book.caseSensitive,
    matchWholeWords: book.matchWholeWords,
    entries: entries.map((entry) => ({
      uid: entry.uid,
      name: entry.name,
      keys: entry.keys ?? [],
      secondaryKeys: entry.secondaryKeys ?? undefined,
      content: entry.content,
      constant: entry.constant,
      selective: entry.selective,
      selectiveLogic: entry.selectiveLogic,
      position: entry.position,
      depth: entry.depth,
      sortOrder: entry.sortOrder,
      probability: entry.probability,
      useProbability: entry.useProbability,
      enabled: entry.enabled,
      caseSensitive: entry.caseSensitive,
      matchWholeWords: entry.matchWholeWords,
      groupName: entry.groupName,
      groupWeight: entry.groupWeight,
      excludeRecursion: entry.excludeRecursion,
      preventRecursion: entry.preventRecursion,
      delayUntilRecursion: entry.delayUntilRecursion,
      scanDepth: entry.scanDepth,
      tokenBudget: entry.tokenBudget,
      extensions: entry.extensions ?? undefined,
    })),
  };
}

/**
 * 把用户自己的对话模板展开为不可变快照。
 * 供应商与 API Key 永远不会进入快照，避免泄露给广场访客。
 */
export async function buildTemplateSnapshot(
  userId: string,
  templateId: string,
): Promise<{ template: TemplateRow; snapshot: TemplateSnapshot }> {
  const db = getDb();

  const [template] = await db
    .select()
    .from(chatTemplates)
    .where(
      and(
        eq(chatTemplates.id, templateId),
        eq(chatTemplates.userId, userId),
        isNull(chatTemplates.deletedAt),
      ),
    )
    .limit(1);

  if (!template) {
    throw new ApiError(404, "TEMPLATE_NOT_FOUND", "对话模板不存在或无权访问");
  }
  if (!template.characterId) {
    throw new ApiError(
      400,
      "CHARACTER_REQUIRED",
      "投稿前请先为对话模板绑定一个角色",
    );
  }

  const worldbookIds = template.worldbookIds ?? [];

  const [
    characterRows,
    worldbookRows,
    presetRows,
    styleRows,
    themeRows,
    schemaRows,
    personaRows,
  ] = await Promise.all([
    db
      .select()
      .from(characters)
      .where(
        and(
          eq(characters.id, template.characterId),
          eq(characters.userId, userId),
          isNull(characters.deletedAt),
        ),
      )
      .limit(1),
    worldbookIds.length > 0
      ? db
          .select()
          .from(worldbooks)
          .where(
            and(
              inArray(worldbooks.id, worldbookIds),
              eq(worldbooks.userId, userId),
              isNull(worldbooks.deletedAt),
            ),
          )
          .orderBy(asc(worldbooks.name))
      : Promise.resolve([]),
    template.promptPresetId
      ? db
          .select()
          .from(promptPresets)
          .where(
            and(
              eq(promptPresets.id, template.promptPresetId),
              eq(promptPresets.userId, userId),
              isNull(promptPresets.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    template.chatStyleId
      ? db
          .select()
          .from(chatStyles)
          .where(
            and(
              eq(chatStyles.id, template.chatStyleId),
              eq(chatStyles.userId, userId),
              isNull(chatStyles.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    template.themeId
      ? db
          .select()
          .from(themes)
          .where(
            and(
              eq(themes.id, template.themeId),
              eq(themes.userId, userId),
              isNull(themes.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    template.outputSchemaId
      ? db
          .select()
          .from(outputSchemas)
          .where(
            and(
              eq(outputSchemas.id, template.outputSchemaId),
              eq(outputSchemas.userId, userId),
              isNull(outputSchemas.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
    template.personaId
      ? db
          .select()
          .from(personas)
          .where(
            and(
              eq(personas.id, template.personaId),
              eq(personas.userId, userId),
              isNull(personas.deletedAt),
            ),
          )
          .limit(1)
      : Promise.resolve([]),
  ]);

  const character = characterRows[0];
  if (!character) {
    throw new ApiError(
      400,
      "CHARACTER_REQUIRED",
      "模板绑定的角色已被删除，请重新选择角色后再投稿",
    );
  }

  const entryRows =
    worldbookRows.length > 0
      ? await db
          .select()
          .from(worldbookEntries)
          .where(
            inArray(
              worldbookEntries.worldbookId,
              worldbookRows.map((book) => book.id),
            ),
          )
          .orderBy(worldbookEntries.sortOrder, worldbookEntries.createdAt)
      : [];

  const entriesByBook = new Map<string, WorldbookEntryRow[]>();
  for (const entry of entryRows) {
    const list = entriesByBook.get(entry.worldbookId);
    if (list) list.push(entry);
    else entriesByBook.set(entry.worldbookId, [entry]);
  }

  const preset = presetRows[0];
  const style = styleRows[0];
  const theme = themeRows[0];
  const schema = schemaRows[0];
  const persona = personaRows[0];

  const presetSnapshot: PromptPresetSnapshot | null = preset
    ? {
        name: preset.name,
        description: preset.description,
        systemPrompt: preset.systemPrompt,
        postHistoryInstructions: preset.postHistoryInstructions,
        blocks: preset.blocks ?? undefined,
        variables: preset.variables ?? undefined,
      }
    : null;

  const themeSnapshot: ThemeSnapshot | null = theme
    ? {
        name: theme.name,
        description: theme.description,
        tokens: theme.tokens ?? undefined,
        customCss: theme.customCss,
        backgroundUrl: theme.backgroundUrl,
        mode: theme.mode,
      }
    : null;

  const snapshot: TemplateSnapshot = {
    schemaVersion: 1,
    character: toCharacterSnapshot(character),
    worldbooks: worldbookRows.map((book) =>
      toWorldbookSnapshot(book, entriesByBook.get(book.id) ?? []),
    ),
    promptPreset: presetSnapshot,
    chatStyle: style ? toChatStyleSnapshot(style) : null,
    theme: themeSnapshot,
    outputSchema: schema ? toOutputSchemaSnapshot(schema) : null,
    persona: persona ? toPersonaSnapshot(persona) : null,
    settings: template.settings ?? undefined,
    greetingIndex: template.greetingIndex,
    source: {
      format: "jiuguan",
      importedAt: new Date().toISOString(),
    },
  };

  return { template, snapshot };
}
