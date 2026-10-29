import type {
  CharacterSnapshot,
  ChatStyleSnapshot,
  MessageMetadata,
  OutputSchemaSnapshot,
  PersonaSnapshot,
  SessionSettings,
  ThemeSnapshot,
} from "@/db/schema/types";
import type { TemplateOptions } from "@/lib/types/content";

export type ChatMessageDTO = {
  id: string;
  role: "system" | "user" | "assistant" | "note";
  content: string;
  rawContent: string | null;
  structured: unknown;
  status: "pending" | "streaming" | "complete" | "error" | "cancelled";
  parentId: string | null;
  activeChildId: string | null;
  metadata: MessageMetadata | null;
  tokensIn: number | null;
  tokensOut: number | null;
  createdAt: string;
  /** 同一父节点下的兄弟消息，用于重新生成后的分支切换 */
  siblingIds: string[];
  siblingIndex: number;
};

export type ChatSessionDTO = {
  id: string;
  title: string;
  characterId: string | null;
  templateId: string | null;
  providerId: string | null;
  chatStyleId: string | null;
  promptPresetId: string | null;
  themeId: string | null;
  personaId: string | null;
  outputSchemaId: string | null;
  worldbookIds: string[] | null;
  model: string | null;
  settings: SessionSettings | null;
  activeLeafId: string | null;
  lastMessageAt: string | null;
  messageCount: number;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  characterName?: string | null;
  characterAvatar?: string | null;
};

export type ChatProviderInfo = {
  id: string;
  name: string;
  model: string;
  models: string[] | null;
  contextWindow: number;
};

export type ChatMemoryKind = "permanent" | "hidden" | "summary" | "note";

export type ChatMemoryDTO = {
  id: string;
  kind: ChatMemoryKind;
  title: string | null;
  content: string;
  importance: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChatCompressionDTO = {
  id: string;
  summary: string;
  tokensBefore: number | null;
  tokensAfter: number | null;
  messageCount: number | null;
  toMessageId: string | null;
  createdAt: string;
};

export type ChatMemoryStateDTO = {
  memories: ChatMemoryDTO[];
  compression: ChatCompressionDTO | null;
};

export type ChatDetailDTO = {
  session: ChatSessionDTO;
  messages: ChatMessageDTO[];
  character: CharacterSnapshot | null;
  style: ChatStyleSnapshot | null;
  theme: ThemeSnapshot | null;
  schema: OutputSchemaSnapshot | null;
  persona: PersonaSnapshot | null;
  provider: ChatProviderInfo | null;
  options: TemplateOptions;
};

export type ChatStreamMeta = {
  sessionId: string;
  assistantId: string;
  userMessage: ChatMessageDTO | null;
  providerName: string | null;
  model: string | null;
};

export type ChatStreamDone = {
  message: ChatMessageDTO;
  session: Pick<
    ChatSessionDTO,
    "id" | "title" | "activeLeafId" | "messageCount" | "lastMessageAt" | "updatedAt"
  >;
};
