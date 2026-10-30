import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  mediumtext,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { users } from "./auth";
import { apiProviders } from "./providers";
import { createdAt, softDelete, timestamps, uuidPk, uuidRef } from "./common";
import type {
  PromptBlock,
  SessionSettings,
  StyleConfig,
} from "./types";

/** 角色卡。字段尽量覆盖 SillyTavern 的角色卡结构，便于导入导出。 */
export const characters = mysqlTable(
  "characters",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    avatarUrl: varchar("avatar_url", { length: 512 }),
    tagline: varchar("tagline", { length: 160 }),
    description: mediumtext("description"),
    personality: mediumtext("personality"),
    scenario: mediumtext("scenario"),
    firstMessage: mediumtext("first_message"),
    alternateGreetings: json("alternate_greetings").$type<string[]>(),
    exampleDialogue: mediumtext("example_dialogue"),
    systemPrompt: mediumtext("system_prompt"),
    postHistoryInstructions: mediumtext("post_history_instructions"),
    creatorNotes: mediumtext("creator_notes"),
    tags: json("tags").$type<string[]>(),
    extensions: json("extensions").$type<Record<string, unknown>>(),
    source: mysqlEnum("source", ["manual", "ai", "import"])
      .notNull()
      .default("manual"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    index("characters_user_idx").on(t.userId),
    index("characters_user_name_idx").on(t.userId, t.name),
  ],
);

/** 角色维度绑定的用户身份（同一角色可用不同 persona 出场）。 */
export const characterPersonas = mysqlTable(
  "character_personas",
  {
    id: uuidPk(),
    characterId: uuidRef("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    personaId: uuidRef("persona_id").notNull(),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("character_personas_character_user_uq").on(
      t.characterId,
      t.userId,
    ),
    index("character_personas_persona_idx").on(t.personaId),
  ],
);

export const worldbooks = mysqlTable(
  "worldbooks",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    description: mediumtext("description"),
    scanDepth: int("scan_depth", { unsigned: true }).notNull().default(4),
    tokenBudget: int("token_budget", { unsigned: true })
      .notNull()
      .default(2048),
    recursive: boolean("recursive").notNull().default(false),
    maxRecursionDepth: int("max_recursion_depth", { unsigned: true })
      .notNull()
      .default(2),
    caseSensitive: boolean("case_sensitive").notNull().default(false),
    matchWholeWords: boolean("match_whole_words").notNull().default(false),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [index("worldbooks_user_idx").on(t.userId)],
);

export const worldbookEntries = mysqlTable(
  "worldbook_entries",
  {
    id: uuidPk(),
    worldbookId: uuidRef("worldbook_id")
      .notNull()
      .references(() => worldbooks.id, { onDelete: "cascade" }),
    /** SillyTavern 导入时保留原始 uid，便于重复导入去重 */
    uid: varchar("uid", { length: 64 }),
    name: varchar("name", { length: 128 }).notNull(),
    keys: json("keys").$type<string[]>(),
    secondaryKeys: json("secondary_keys").$type<string[]>(),
    content: mediumtext("content").notNull(),
    constant: boolean("constant").notNull().default(false),
    selective: boolean("selective").notNull().default(true),
    selectiveLogic: varchar("selective_logic", { length: 32 })
      .notNull()
      .default("and_any"),
    position: varchar("position", { length: 32 })
      .notNull()
      .default("before_char"),
    depth: int("depth", { unsigned: true }).notNull().default(4),
    sortOrder: int("sort_order").notNull().default(100),
    probability: int("probability", { unsigned: true }).notNull().default(100),
    useProbability: boolean("use_probability").notNull().default(true),
    enabled: boolean("enabled").notNull().default(true),
    /** null 表示继承世界书设置 */
    caseSensitive: boolean("case_sensitive"),
    /** null 表示继承世界书设置 */
    matchWholeWords: boolean("match_whole_words"),
    groupName: varchar("group_name", { length: 64 }),
    groupWeight: int("group_weight").notNull().default(100),
    excludeRecursion: boolean("exclude_recursion").notNull().default(false),
    preventRecursion: boolean("prevent_recursion").notNull().default(false),
    delayUntilRecursion: boolean("delay_until_recursion")
      .notNull()
      .default(false),
    scanDepth: int("scan_depth", { unsigned: true }),
    tokenBudget: int("token_budget", { unsigned: true }),
    extensions: json("extensions").$type<Record<string, unknown>>(),
    ...timestamps(),
  },
  (t) => [
    index("worldbook_entries_book_idx").on(t.worldbookId),
    index("worldbook_entries_book_enabled_idx").on(t.worldbookId, t.enabled),
  ],
);

/** 默认提示词 / 提示词预设。 */
export const promptPresets = mysqlTable(
  "prompt_presets",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    description: mediumtext("description"),
    systemPrompt: mediumtext("system_prompt"),
    postHistoryInstructions: mediumtext("post_history_instructions"),
    blocks: json("blocks").$type<PromptBlock[]>(),
    variables: json("variables").$type<Record<string, string>>(),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [index("prompt_presets_user_idx").on(t.userId)],
);

export const chatStyles = mysqlTable(
  "chat_styles",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    description: mediumtext("description"),
    /** 内置样式标识，用户复制内置样式后仍保留来源 */
    builtInKey: varchar("built_in_key", { length: 32 }),
    config: json("config").$type<StyleConfig>(),
    /** 已通过 css-tree 白名单清洗的自定义 CSS */
    customCss: mediumtext("custom_css"),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [index("chat_styles_user_idx").on(t.userId)],
);

export const themes = mysqlTable(
  "themes",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    description: mediumtext("description"),
    tokens: json("tokens").$type<Record<string, string>>(),
    customCss: mediumtext("custom_css"),
    backgroundUrl: varchar("background_url", { length: 1024 }),
    mode: mysqlEnum("mode", ["dark", "light", "both"]).notNull().default("both"),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [index("themes_user_idx").on(t.userId)],
);

/** 用户扮演的身份（{{user}}）。 */
export const personas = mysqlTable(
  "personas",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 48 }).notNull(),
    avatarUrl: varchar("avatar_url", { length: 512 }),
    description: mediumtext("description"),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [index("personas_user_idx").on(t.userId)],
);

export const quickReplies = mysqlTable(
  "quick_replies",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    content: mediumtext("content").notNull(),
    category: varchar("category", { length: 32 }),
    sortOrder: int("sort_order").notNull().default(0),
    ...timestamps(),
  },
  (t) => [index("quick_replies_user_idx").on(t.userId)],
);

/** 上传的图片/附件元数据，实际文件在 public/uploads 或对象存储。 */
export const mediaAssets = mysqlTable(
  "media_assets",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: mysqlEnum("kind", ["avatar", "background", "image", "attachment"])
      .notNull()
      .default("image"),
    url: varchar("url", { length: 1024 }).notNull(),
    mimeType: varchar("mime_type", { length: 64 }).notNull(),
    size: int("size", { unsigned: true }).notNull().default(0),
    width: int("width", { unsigned: true }),
    height: int("height", { unsigned: true }),
    originalName: varchar("original_name", { length: 255 }),
    createdAt: createdAt(),
  },
  (t) => [
    index("media_assets_user_idx").on(t.userId),
    index("media_assets_kind_idx").on(t.kind),
  ],
);

/**
 * AI 返回格式：JSON Schema 2020-12 + x-ui 渲染指令。
 * mode=json_schema 时走严格约束；json_object 只要求合法 JSON。
 */
export const outputSchemas = mysqlTable(
  "output_schemas",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    description: mediumtext("description"),
    schema: json("schema").$type<Record<string, unknown>>().notNull(),
    sample: json("sample").$type<unknown>(),
    mode: mysqlEnum("mode", ["json_object", "json_schema", "text"])
      .notNull()
      .default("json_object"),
    strict: boolean("strict").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [index("output_schemas_user_idx").on(t.userId)],
);

/** 对话模板：角色 + 世界书 + 提示词 + 样式 + 输出格式的一键组合。 */
export const chatTemplates = mysqlTable(
  "chat_templates",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 80 }).notNull(),
    description: mediumtext("description"),
    coverUrl: varchar("cover_url", { length: 1024 }),
    characterId: uuidRef("character_id").references(() => characters.id, {
      onDelete: "set null",
    }),
    worldbookIds: json("worldbook_ids").$type<string[]>(),
    promptPresetId: uuidRef("prompt_preset_id").references(
      () => promptPresets.id,
      { onDelete: "set null" },
    ),
    chatStyleId: uuidRef("chat_style_id").references(() => chatStyles.id, {
      onDelete: "set null",
    }),
    themeId: uuidRef("theme_id").references(() => themes.id, {
      onDelete: "set null",
    }),
    outputSchemaId: uuidRef("output_schema_id").references(
      () => outputSchemas.id,
      { onDelete: "set null" },
    ),
    personaId: uuidRef("persona_id").references(() => personas.id, {
      onDelete: "set null",
    }),
    providerId: uuidRef("provider_id").references(() => apiProviders.id, {
      onDelete: "set null",
    }),
    settings: json("settings").$type<SessionSettings>(),
    greetingIndex: int("greeting_index", { unsigned: true })
      .notNull()
      .default(0),
    usageCount: int("usage_count", { unsigned: true }).notNull().default(0),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    index("chat_templates_user_idx").on(t.userId),
    index("chat_templates_user_updated_idx").on(t.userId, t.updatedAt),
  ],
);
