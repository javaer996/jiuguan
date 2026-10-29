import type {
  apiProviders,
  characters,
  chatSessions,
  chatStyles,
  messages,
  outputSchemas,
  personas,
  themes,
} from "@/db/schema";
import type {
  CharacterSnapshot,
  ChatStyleSnapshot,
  OutputSchemaSnapshot,
  PersonaSnapshot,
  ThemeSnapshot,
} from "@/db/schema/types";
import type {
  ChatMessageDTO,
  ChatProviderInfo,
  ChatSessionDTO,
} from "@/lib/types/chat";

type SessionRow = typeof chatSessions.$inferSelect;
type MessageRow = typeof messages.$inferSelect;
type CharacterRow = typeof characters.$inferSelect;
type StyleRow = typeof chatStyles.$inferSelect;
type SchemaRow = typeof outputSchemas.$inferSelect;
type PersonaRow = typeof personas.$inferSelect;
type ThemeRow = typeof themes.$inferSelect;
type ProviderRow = typeof apiProviders.$inferSelect;

export function toChatSessionDTO(
  row: SessionRow,
  extra?: { characterName?: string | null; characterAvatar?: string | null },
): ChatSessionDTO {
  return {
    id: row.id,
    title: row.title,
    characterId: row.characterId,
    templateId: row.templateId,
    providerId: row.providerId,
    chatStyleId: row.chatStyleId,
    promptPresetId: row.promptPresetId,
    themeId: row.themeId,
    personaId: row.personaId,
    outputSchemaId: row.outputSchemaId,
    worldbookIds: row.worldbookIds ?? null,
    model: row.model,
    settings: row.settings ?? null,
    activeLeafId: row.activeLeafId,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    messageCount: row.messageCount,
    pinned: row.pinned,
    archived: row.archived,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    characterName: extra?.characterName ?? null,
    characterAvatar: extra?.characterAvatar ?? null,
  };
}

export function toChatMessageDTO(
  row: MessageRow,
  siblingIds: string[] = [],
): ChatMessageDTO {
  const index = siblingIds.indexOf(row.id);
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    rawContent: row.rawContent,
    structured: row.structured ?? null,
    status: row.status,
    parentId: row.parentId,
    activeChildId: row.activeChildId,
    metadata: row.metadata ?? null,
    tokensIn: row.tokensIn,
    tokensOut: row.tokensOut,
    createdAt: row.createdAt.toISOString(),
    siblingIds,
    siblingIndex: index === -1 ? 0 : index,
  };
}

export function toProviderInfo(row: ProviderRow): ChatProviderInfo {
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    models: row.models ?? null,
    contextWindow: row.contextWindow,
  };
}

export function toCharacterSnapshot(row: CharacterRow): CharacterSnapshot {
  return {
    name: row.name,
    avatarUrl: row.avatarUrl,
    tagline: row.tagline,
    description: row.description,
    personality: row.personality,
    scenario: row.scenario,
    firstMessage: row.firstMessage,
    alternateGreetings: row.alternateGreetings ?? undefined,
    exampleDialogue: row.exampleDialogue,
    systemPrompt: row.systemPrompt,
    postHistoryInstructions: row.postHistoryInstructions,
    creatorNotes: row.creatorNotes,
    tags: row.tags ?? undefined,
    extensions: row.extensions ?? undefined,
  };
}

export function toChatStyleSnapshot(row: StyleRow): ChatStyleSnapshot {
  return {
    name: row.name,
    description: row.description,
    builtInKey: row.builtInKey,
    config: row.config ?? undefined,
    customCss: row.customCss,
  };
}

export function toThemeSnapshot(row: ThemeRow): ThemeSnapshot {
  return {
    name: row.name,
    description: row.description,
    tokens: row.tokens ?? undefined,
    customCss: row.customCss,
    backgroundUrl: row.backgroundUrl,
    mode: row.mode,
  };
}

export function toOutputSchemaSnapshot(row: SchemaRow): OutputSchemaSnapshot {
  return {
    name: row.name,
    description: row.description,
    schema: row.schema,
    sample: row.sample ?? undefined,
    mode: row.mode,
    strict: row.strict,
  };
}

export function toPersonaSnapshot(row: PersonaRow): PersonaSnapshot {
  return {
    name: row.name,
    avatarUrl: row.avatarUrl,
    description: row.description,
  };
}
