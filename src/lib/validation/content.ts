import { z } from "zod";

const nullableUrl = z.string().trim().max(1024).nullish();
const tagsSchema = z
  .array(z.string().trim().min(1).max(32))
  .max(20)
  .optional()
  .transform((tags) => (tags ? [...new Set(tags)] : undefined));

/* ---------------- 角色 ---------------- */

export const characterInputSchema = z.object({
  name: z.string().trim().min(1, "角色名不能为空").max(64),
  avatarUrl: nullableUrl,
  tagline: z.string().trim().max(160).nullish(),
  description: z.string().max(50_000).nullish(),
  personality: z.string().max(20_000).nullish(),
  scenario: z.string().max(20_000).nullish(),
  firstMessage: z.string().max(20_000).nullish(),
  alternateGreetings: z
    .array(z.string().max(10_000))
    .max(20)
    .nullish(),
  exampleDialogue: z.string().max(50_000).nullish(),
  systemPrompt: z.string().max(20_000).nullish(),
  postHistoryInstructions: z.string().max(20_000).nullish(),
  creatorNotes: z.string().max(20_000).nullish(),
  tags: tagsSchema,
  source: z.enum(["manual", "ai", "import"]).optional(),
});

/* ---------------- 世界书 ---------------- */

export const worldbookInputSchema = z.object({
  name: z.string().trim().min(1, "世界书名称不能为空").max(80),
  description: z.string().max(20_000).nullish(),
  scanDepth: z.number().int().min(0).max(50).optional(),
  tokenBudget: z.number().int().min(0).max(100_000).optional(),
  recursive: z.boolean().optional(),
  maxRecursionDepth: z.number().int().min(0).max(10).optional(),
  caseSensitive: z.boolean().optional(),
  matchWholeWords: z.boolean().optional(),
});

export const selectiveLogicSchema = z.enum([
  "and_any",
  "and_all",
  "not_all",
  "not_any",
]);

export const worldbookPositionSchema = z.enum([
  "before_char",
  "after_char",
  "before_an",
  "after_an",
  "at_depth",
  "top",
  "bottom",
]);

export const worldbookEntryInputSchema = z.object({
  uid: z.string().max(64).nullish(),
  name: z.string().trim().min(1, "条目名称不能为空").max(128),
  keys: z.array(z.string().trim().min(1).max(64)).max(100).optional(),
  secondaryKeys: z.array(z.string().trim().min(1).max(64)).max(100).optional(),
  content: z.string().max(200_000).default(""),
  constant: z.boolean().optional(),
  selective: z.boolean().optional(),
  selectiveLogic: selectiveLogicSchema.optional(),
  position: worldbookPositionSchema.optional(),
  depth: z.number().int().min(0).max(100).optional(),
  sortOrder: z.number().int().min(-100_000).max(100_000).optional(),
  probability: z.number().int().min(0).max(100).optional(),
  useProbability: z.boolean().optional(),
  enabled: z.boolean().optional(),
  /** null / 缺省表示继承世界书 */
  caseSensitive: z.boolean().nullish(),
  /** null / 缺省表示继承世界书 */
  matchWholeWords: z.boolean().nullish(),
  groupName: z.string().trim().max(64).nullish(),
  groupWeight: z.number().int().min(0).max(10_000).optional(),
  excludeRecursion: z.boolean().optional(),
  preventRecursion: z.boolean().optional(),
  delayUntilRecursion: z.boolean().optional(),
  scanDepth: z.number().int().min(0).max(50).nullish(),
  tokenBudget: z.number().int().min(0).max(100_000).nullish(),
  extensions: z.record(z.string(), z.unknown()).nullish(),
});

/* ---------------- 提示词 ---------------- */

export const promptBlockSchema = z.object({
  id: z.string().min(1).max(64),
  name: z.string().max(80),
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().max(50_000),
  enabled: z.boolean(),
  position: z.enum(["main", "pre_history", "post_history", "depth"]),
  depth: z.number().int().min(0).max(100).optional(),
  marker: z
    .enum([
      "char",
      "user",
      "persona",
      "worldbook",
      "chat_history",
      "author_note",
    ])
    .optional(),
});

export const promptPresetInputSchema = z.object({
  name: z.string().trim().min(1, "预设名称不能为空").max(80),
  description: z.string().max(20_000).nullish(),
  systemPrompt: z.string().max(50_000).nullish(),
  postHistoryInstructions: z.string().max(50_000).nullish(),
  blocks: z.array(promptBlockSchema).max(100).nullish(),
  variables: z.record(z.string(), z.string().max(2000)).nullish(),
  isDefault: z.boolean().optional(),
});

/* ---------------- 样式 ---------------- */

export const styleConfigSchema = z.looseObject({
  layout: z.enum(["bubble", "novel", "messenger", "document"]).optional(),
  userBubble: z.string().max(200).optional(),
  assistantBubble: z.string().max(200).optional(),
  userTextColor: z.string().max(100).optional(),
  assistantTextColor: z.string().max(100).optional(),
  userAccentColor: z.string().max(100).optional(),
  assistantAccentColor: z.string().max(100).optional(),
  userFontFamily: z.string().max(200).optional(),
  assistantFontFamily: z.string().max(200).optional(),
  userFontSize: z.number().min(10).max(28).optional(),
  assistantFontSize: z.number().min(10).max(28).optional(),
  userLineHeight: z.number().min(1).max(3).optional(),
  assistantLineHeight: z.number().min(1).max(3).optional(),
  fontFamily: z.string().max(200).optional(),
  fontSize: z.number().min(10).max(28).optional(),
  lineHeight: z.number().min(1).max(3).optional(),
  showAvatars: z.boolean().optional(),
  showTimestamps: z.boolean().optional(),
  narrationColor: z.string().max(100).optional(),
  accentColor: z.string().max(100).optional(),
  backgroundImage: z.string().max(1024).optional(),
  backgroundDim: z.number().min(0).max(100).optional(),
  maxWidth: z.number().min(400).max(1600).optional(),
  narrationQuotes: z.boolean().optional(),
  dropCap: z.boolean().optional(),
  dropCapColor: z.string().max(100).optional(),
  dropCapEffect: z.enum(["none", "gradient", "glow"]).optional(),
  showStatusTags: z.boolean().optional(),
  statusTags: z.array(z.string().trim().min(1).max(16)).max(12).optional(),
  statusTagNotes: z
    .record(z.string().max(16), z.string().max(300))
    .refine((notes) => Object.keys(notes).length <= 12, "状态说明条目过多")
    .optional(),
  showGoal: z.boolean().optional(),
  showReplyOptions: z.boolean().optional(),
  replyOptionStyles: z
    .array(z.string().trim().min(1).max(16))
    .max(8)
    .optional(),
  replyOptionCount: z.number().int().min(1).max(6).optional(),
});

export const chatStyleInputSchema = z.object({
  name: z.string().trim().min(1, "样式名称不能为空").max(80),
  description: z.string().max(20_000).nullish(),
  builtInKey: z.string().max(32).nullish(),
  config: styleConfigSchema.nullish(),
  customCss: z.string().max(50_000).nullish(),
});

export const themeInputSchema = z.object({
  name: z.string().trim().min(1, "主题名称不能为空").max(80),
  description: z.string().max(20_000).nullish(),
  tokens: z.record(z.string(), z.string().max(200)).nullish(),
  customCss: z.string().max(50_000).nullish(),
  backgroundUrl: nullableUrl,
  mode: z.enum(["dark", "light", "both"]).optional(),
  isDefault: z.boolean().optional(),
});

/* ---------------- 用户身份与快捷回复 ---------------- */

export const personaInputSchema = z.object({
  name: z.string().trim().min(1, "身份名称不能为空").max(48),
  avatarUrl: nullableUrl,
  description: z.string().max(20_000).nullish(),
  isDefault: z.boolean().optional(),
});

export const quickReplyInputSchema = z.object({
  name: z.string().trim().min(1, "快捷回复名称不能为空").max(64),
  content: z.string().max(20_000).default(""),
  category: z.string().trim().max(32).nullish(),
  sortOrder: z.number().int().min(-10_000).max(10_000).optional(),
});

/* ---------------- 输出格式 ---------------- */

export const outputSchemaInputSchema = z.object({
  name: z.string().trim().min(1, "格式名称不能为空").max(80),
  description: z.string().max(20_000).nullish(),
  schema: z.record(z.string(), z.unknown()),
  sample: z.unknown().optional(),
  mode: z.enum(["json_object", "json_schema", "text"]).optional(),
  strict: z.boolean().optional(),
  isDefault: z.boolean().optional(),
});

/* ---------------- 对话模板 ---------------- */

export const chatTemplateInputSchema = z.object({
  name: z.string().trim().min(1, "模板名称不能为空").max(80),
  description: z.string().max(20_000).nullish(),
  coverUrl: nullableUrl,
  characterId: z.uuid().nullish(),
  worldbookIds: z.array(z.uuid()).max(20).nullish(),
  promptPresetId: z.uuid().nullish(),
  chatStyleId: z.uuid().nullish(),
  themeId: z.uuid().nullish(),
  outputSchemaId: z.uuid().nullish(),
  personaId: z.uuid().nullish(),
  providerId: z.uuid().nullish(),
  settings: z.record(z.string(), z.unknown()).nullish(),
  greetingIndex: z.number().int().min(0).max(20).optional(),
});

export type CharacterInput = z.infer<typeof characterInputSchema>;
export type WorldbookInput = z.infer<typeof worldbookInputSchema>;
export type WorldbookEntryInput = z.infer<typeof worldbookEntryInputSchema>;
export type PromptPresetInput = z.infer<typeof promptPresetInputSchema>;
export type ChatStyleInput = z.infer<typeof chatStyleInputSchema>;
export type ThemeInput = z.infer<typeof themeInputSchema>;
export type PersonaInput = z.infer<typeof personaInputSchema>;
export type QuickReplyInput = z.infer<typeof quickReplyInputSchema>;
export type OutputSchemaInput = z.infer<typeof outputSchemaInputSchema>;
export type ChatTemplateInput = z.infer<typeof chatTemplateInputSchema>;
