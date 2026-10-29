import type {
  characters,
  chatStyles,
  chatTemplates,
  outputSchemas,
  promptPresets,
  themes,
  worldbooks,
  worldbookEntries,
} from "@/db/schema";
import type {
  CharacterDTO,
  CharacterListItem,
  ChatStyleDTO,
  ChatTemplateDTO,
  OutputSchemaDTO,
  PromptPresetDTO,
  ThemeDTO,
  WorldbookDTO,
  WorldbookEntryDTO,
} from "@/lib/types/content";

type CharacterRow = typeof characters.$inferSelect;

export function toCharacterDTO(row: CharacterRow): CharacterDTO {
  return {
    id: row.id,
    name: row.name,
    avatarUrl: row.avatarUrl,
    tagline: row.tagline,
    description: row.description,
    personality: row.personality,
    scenario: row.scenario,
    firstMessage: row.firstMessage,
    alternateGreetings: row.alternateGreetings ?? null,
    exampleDialogue: row.exampleDialogue,
    systemPrompt: row.systemPrompt,
    postHistoryInstructions: row.postHistoryInstructions,
    creatorNotes: row.creatorNotes,
    tags: row.tags ?? null,
    extensions: row.extensions ?? null,
    source: row.source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCharacterListItem(row: CharacterRow): CharacterListItem {
  return {
    id: row.id,
    name: row.name,
    avatarUrl: row.avatarUrl,
    tagline: row.tagline,
    tags: row.tags ?? null,
    source: row.source,
    updatedAt: row.updatedAt.toISOString(),
  };
}

type WorldbookRow = typeof worldbooks.$inferSelect;
type WorldbookEntryRow = typeof worldbookEntries.$inferSelect;

export function toWorldbookDTO(
  row: WorldbookRow,
  entryCount?: number,
): WorldbookDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    scanDepth: row.scanDepth,
    tokenBudget: row.tokenBudget,
    recursive: row.recursive,
    maxRecursionDepth: row.maxRecursionDepth,
    caseSensitive: row.caseSensitive,
    matchWholeWords: row.matchWholeWords,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ...(entryCount === undefined ? {} : { entryCount }),
  };
}

export function toWorldbookEntryDTO(
  row: WorldbookEntryRow,
): WorldbookEntryDTO {
  return {
    id: row.id,
    worldbookId: row.worldbookId,
    uid: row.uid,
    name: row.name,
    keys: row.keys ?? null,
    secondaryKeys: row.secondaryKeys ?? null,
    content: row.content,
    constant: row.constant,
    selective: row.selective,
    selectiveLogic: row.selectiveLogic,
    position: row.position,
    depth: row.depth,
    sortOrder: row.sortOrder,
    probability: row.probability,
    useProbability: row.useProbability,
    enabled: row.enabled,
    caseSensitive: row.caseSensitive,
    matchWholeWords: row.matchWholeWords,
    groupName: row.groupName,
    groupWeight: row.groupWeight,
    excludeRecursion: row.excludeRecursion,
    preventRecursion: row.preventRecursion,
    delayUntilRecursion: row.delayUntilRecursion,
    scanDepth: row.scanDepth,
    tokenBudget: row.tokenBudget,
    extensions: row.extensions ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type PromptPresetRow = typeof promptPresets.$inferSelect;
type ChatStyleRow = typeof chatStyles.$inferSelect;
type ThemeRow = typeof themes.$inferSelect;
type OutputSchemaRow = typeof outputSchemas.$inferSelect;
type ChatTemplateRow = typeof chatTemplates.$inferSelect;

export function toPromptPresetDTO(row: PromptPresetRow): PromptPresetDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    systemPrompt: row.systemPrompt,
    postHistoryInstructions: row.postHistoryInstructions,
    blocks: row.blocks ?? null,
    variables: row.variables ?? null,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    blockCount: row.blocks?.length ?? 0,
  };
}

export function toChatStyleDTO(row: ChatStyleRow): ChatStyleDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    builtInKey: row.builtInKey,
    config: row.config ?? null,
    customCss: row.customCss,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toThemeDTO(row: ThemeRow): ThemeDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tokens: row.tokens ?? null,
    customCss: row.customCss,
    backgroundUrl: row.backgroundUrl,
    mode: row.mode,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toOutputSchemaDTO(row: OutputSchemaRow): OutputSchemaDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    schema: row.schema,
    sample: row.sample ?? null,
    mode: row.mode,
    strict: row.strict,
    isDefault: row.isDefault,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toChatTemplateDTO(
  row: ChatTemplateRow,
  extra?: { characterName?: string | null; characterAvatar?: string | null },
): ChatTemplateDTO {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    coverUrl: row.coverUrl,
    characterId: row.characterId,
    worldbookIds: row.worldbookIds ?? null,
    promptPresetId: row.promptPresetId,
    chatStyleId: row.chatStyleId,
    themeId: row.themeId,
    outputSchemaId: row.outputSchemaId,
    personaId: row.personaId,
    providerId: row.providerId,
    settings: row.settings ?? null,
    greetingIndex: row.greetingIndex,
    usageCount: row.usageCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    characterName: extra?.characterName ?? null,
    characterAvatar: extra?.characterAvatar ?? null,
  };
}
