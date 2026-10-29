/**
 * 数据库 JSON 列使用的结构化类型。
 * 这些类型同时会被前端编辑器与 AI 辅助生成复用，改动时注意保持向后兼容。
 */

export type ProviderCapabilities = {
  stream?: boolean;
  jsonMode?: boolean;
  jsonSchema?: boolean;
  vision?: boolean;
  tools?: boolean;
  maxContext?: number;
};

export type PromptBlock = {
  id: string;
  name: string;
  role: "system" | "user" | "assistant";
  content: string;
  enabled: boolean;
  /** main = 主提示词区域，pre/post = 历史前后，depth = 按深度注入 */
  position: "main" | "pre_history" | "post_history" | "depth";
  depth?: number;
  /** 特殊占位块，运行时替换为对应内容 */
  marker?: "char" | "user" | "persona" | "worldbook" | "chat_history" | "author_note";
};

export type ChatAidStatus = {
  label: string;
  value: string;
};

export type ChatAidOption = {
  style: string;
  text: string;
};

/** AI 在每轮回复后整理的互动信息，存放在 assistant 消息的 metadata 中。 */
export type ChatAids = {
  status?: ChatAidStatus[];
  goal?: string;
  options?: ChatAidOption[];
  generatedAt?: string;
  model?: string;
  /** 生成时的互动配置签名，样式变更后前端会据此重新生成 */
  configKey?: string;
};

export type StyleConfig = {
  layout?: "bubble" | "novel" | "messenger" | "document";
  userBubble?: string;
  assistantBubble?: string;
  fontFamily?: string;
  fontSize?: number;
  lineHeight?: number;
  showAvatars?: boolean;
  showTimestamps?: boolean;
  narrationColor?: string;
  accentColor?: string;
  backgroundImage?: string;
  backgroundDim?: number;
  maxWidth?: number;
  /** 是否把引号内的动作描写渲染为旁白 */
  narrationQuotes?: boolean;
  /** 显示 AI 整理的人物状态标签 */
  showStatusTags?: boolean;
  /** 自定义状态标签名称，例如 情绪 / 好感度 / 地点 */
  statusTags?: string[];
  /** 每个状态标签的说明，告诉 AI 它代表什么、如何取值和变化 */
  statusTagNotes?: Record<string, string>;
  /** 显示当前对话目标 */
  showGoal?: boolean;
  /** 在最新回复后显示可点击的回复选项 */
  showReplyOptions?: boolean;
  /** 回复选项的风格列表 */
  replyOptionStyles?: string[];
  /** 每次生成的回复选项数量 */
  replyOptionCount?: number;
  [key: string]: unknown;
};

export type SessionSettings = {
  temperature?: number;
  topP?: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  stop?: string[];
  stream?: boolean;
  contextWindow?: number;
  maxContextMessages?: number;
  authorNote?: string;
  authorNoteDepth?: number;
  autoTitle?: boolean;
  /** 是否把会话记忆注入提示词，默认开启 */
  memoryEnabled?: boolean;
  /** 是否在上下文超过阈值时自动压缩，默认关闭 */
  compressionEnabled?: boolean;
  /** 触发自动压缩的上下文占比，0.3-0.95 */
  compressionThreshold?: number;
  /** 压缩时保留的最近消息条数 */
  compressionKeepRecent?: number;
  summaryEvery?: number;
  [key: string]: unknown;
};

export type UserPreferences = {
  fontSize?: number;
  sendKey?: "enter" | "mod-enter";
  showAvatars?: boolean;
  stream?: boolean;
  reduceMotion?: boolean;
  messageWidth?: "narrow" | "wide";
  [key: string]: unknown;
};

export type MessageAttachment = {
  assetId: string;
  url: string;
  mimeType: string;
  name?: string;
  width?: number;
  height?: number;
};

export type MessageMetadata = {
  model?: string;
  providerId?: string;
  finishReason?: string;
  latencyMs?: number;
  worldbookHits?: { entryId: string; name: string; tokens: number }[];
  error?: string;
  regeneratedFrom?: string;
  attachments?: MessageAttachment[];
  structuredValid?: boolean;
  schemaErrors?: string[];
  thoughts?: string;
  /** 状态标签、对话目标与回复选项 */
  aids?: ChatAids;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  [key: string]: unknown;
};

export type CharacterSnapshot = {
  name: string;
  avatarUrl?: string | null;
  tagline?: string | null;
  description?: string | null;
  personality?: string | null;
  scenario?: string | null;
  firstMessage?: string | null;
  alternateGreetings?: string[];
  exampleDialogue?: string | null;
  systemPrompt?: string | null;
  postHistoryInstructions?: string | null;
  creatorNotes?: string | null;
  tags?: string[];
  extensions?: Record<string, unknown>;
};

export type WorldbookEntrySnapshot = {
  uid?: string | null;
  name: string;
  keys: string[];
  secondaryKeys?: string[];
  content: string;
  constant?: boolean;
  selective?: boolean;
  selectiveLogic?: string;
  position?: string;
  depth?: number;
  sortOrder?: number;
  probability?: number;
  useProbability?: boolean;
  enabled?: boolean;
  caseSensitive?: boolean;
  matchWholeWords?: boolean;
  groupName?: string | null;
  groupWeight?: number;
  excludeRecursion?: boolean;
  preventRecursion?: boolean;
  delayUntilRecursion?: boolean;
  scanDepth?: number | null;
  tokenBudget?: number | null;
  extensions?: Record<string, unknown>;
};

export type WorldbookSnapshot = {
  name: string;
  description?: string | null;
  scanDepth?: number;
  tokenBudget?: number;
  recursive?: boolean;
  maxRecursionDepth?: number;
  caseSensitive?: boolean;
  matchWholeWords?: boolean;
  entries: WorldbookEntrySnapshot[];
};

export type PromptPresetSnapshot = {
  name: string;
  description?: string | null;
  systemPrompt?: string | null;
  postHistoryInstructions?: string | null;
  blocks?: PromptBlock[];
  variables?: Record<string, string>;
};

export type ChatStyleSnapshot = {
  name: string;
  description?: string | null;
  builtInKey?: string | null;
  config?: StyleConfig;
  customCss?: string | null;
};

export type ThemeSnapshot = {
  name: string;
  description?: string | null;
  tokens?: Record<string, string>;
  customCss?: string | null;
  backgroundUrl?: string | null;
  mode?: "dark" | "light" | "both";
};

export type OutputSchemaSnapshot = {
  name: string;
  description?: string | null;
  schema: Record<string, unknown>;
  sample?: unknown;
  mode?: "json_object" | "json_schema" | "text";
  strict?: boolean;
};

export type PersonaSnapshot = {
  name: string;
  avatarUrl?: string | null;
  description?: string | null;
};

export type QuickReplySnapshot = {
  name: string;
  content: string;
  category?: string | null;
};

export type TemplateSnapshot = {
  schemaVersion: 1;
  character: CharacterSnapshot;
  worldbooks: WorldbookSnapshot[];
  promptPreset?: PromptPresetSnapshot | null;
  chatStyle?: ChatStyleSnapshot | null;
  theme?: ThemeSnapshot | null;
  outputSchema?: OutputSchemaSnapshot | null;
  persona?: PersonaSnapshot | null;
  quickReplies?: QuickReplySnapshot[];
  settings?: SessionSettings;
  greetingIndex?: number;
  source?: {
    format?: "jiuguan" | "sillytavern" | "manual";
    importedAt?: string;
  };
};
