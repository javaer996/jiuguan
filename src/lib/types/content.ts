import type {
  PromptBlock,
  SessionSettings,
  StyleConfig,
} from "@/db/schema/types";

export type CharacterSource = "manual" | "ai" | "import";

export type CharacterDTO = {
  id: string;
  name: string;
  avatarUrl: string | null;
  tagline: string | null;
  description: string | null;
  personality: string | null;
  scenario: string | null;
  firstMessage: string | null;
  alternateGreetings: string[] | null;
  exampleDialogue: string | null;
  systemPrompt: string | null;
  postHistoryInstructions: string | null;
  creatorNotes: string | null;
  tags: string[] | null;
  extensions: Record<string, unknown> | null;
  source: CharacterSource;
  createdAt: string;
  updatedAt: string;
};

export type CharacterListItem = {
  id: string;
  name: string;
  avatarUrl: string | null;
  tagline: string | null;
  tags: string[] | null;
  source: CharacterSource;
  updatedAt: string;
};

export type WorldbookDTO = {
  id: string;
  name: string;
  description: string | null;
  scanDepth: number;
  tokenBudget: number;
  recursive: boolean;
  maxRecursionDepth: number;
  caseSensitive: boolean;
  matchWholeWords: boolean;
  createdAt: string;
  updatedAt: string;
  entryCount?: number;
};

export type WorldbookDetailDTO = WorldbookDTO & {
  entries: WorldbookEntryDTO[];
};

export type PromptPresetDTO = {
  id: string;
  name: string;
  description: string | null;
  systemPrompt: string | null;
  postHistoryInstructions: string | null;
  blocks: PromptBlock[] | null;
  variables: Record<string, string> | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
  blockCount?: number;
};

export type ChatStyleDTO = {
  id: string;
  name: string;
  description: string | null;
  builtInKey: string | null;
  config: StyleConfig | null;
  customCss: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ThemeDTO = {
  id: string;
  name: string;
  description: string | null;
  tokens: Record<string, string> | null;
  customCss: string | null;
  backgroundUrl: string | null;
  mode: "dark" | "light" | "both";
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type OutputSchemaDTO = {  id: string;
  name: string;
  description: string | null;
  schema: Record<string, unknown>;
  sample: unknown;
  mode: "json_object" | "json_schema" | "text";
  strict: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ChatTemplateDTO = {
  id: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  characterId: string | null;
  worldbookIds: string[] | null;
  promptPresetId: string | null;
  chatStyleId: string | null;
  themeId: string | null;
  outputSchemaId: string | null;
  personaId: string | null;
  providerId: string | null;
  settings: SessionSettings | null;
  greetingIndex: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  characterName?: string | null;
  characterAvatar?: string | null;
};

export type TemplateOption = {
  id: string;
  name: string;
  avatarUrl?: string | null;
  description?: string | null;
  isDefault?: boolean;
};

export type ProviderOption = TemplateOption & {
  /** 供应商的默认模型 */
  model: string;
  /** 供应商维护的全部可用模型 */
  models: string[] | null;
};

/** 对话模板编辑器可引用的资源，均由服务端按当前用户过滤。 */
export type TemplateOptions = {
  characters: TemplateOption[];
  worldbooks: TemplateOption[];
  prompts: TemplateOption[];
  styles: TemplateOption[];
  schemas: TemplateOption[];
  personas: TemplateOption[];
  themes: TemplateOption[];
  providers: ProviderOption[];
};

export type WorldbookEntryDTO = {
  id: string;
  worldbookId: string;
  uid: string | null;
  name: string;
  keys: string[] | null;
  secondaryKeys: string[] | null;
  content: string;
  constant: boolean;
  selective: boolean;
  selectiveLogic: string;
  position: string;
  depth: number;
  sortOrder: number;
  probability: number;
  useProbability: boolean;
  enabled: boolean;
  /** null 表示继承世界书设置 */
  caseSensitive: boolean | null;
  /** null 表示继承世界书设置 */
  matchWholeWords: boolean | null;
  groupName: string | null;
  groupWeight: number;
  excludeRecursion: boolean;
  preventRecursion: boolean;
  delayUntilRecursion: boolean;
  scanDepth: number | null;
  tokenBudget: number | null;
  extensions: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};
