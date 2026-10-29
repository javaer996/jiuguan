import {
  boolean,
  datetime,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  longtext,
  mediumtext,
  varchar,
} from "drizzle-orm/mysql-core";
import { users } from "./auth";
import { apiProviders } from "./providers";
import {
  characters,
  chatStyles,
  chatTemplates,
  outputSchemas,
  personas,
  promptPresets,
  themes,
} from "./content";
import { createdAt, softDelete, timestamps, uuidPk, uuidRef } from "./common";
import type { MessageMetadata, SessionSettings } from "./types";

export const chatSessions = mysqlTable(
  "chat_sessions",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 160 }).notNull().default("新的对话"),
    characterId: uuidRef("character_id").references(() => characters.id, {
      onDelete: "set null",
    }),
    templateId: uuidRef("template_id").references(() => chatTemplates.id, {
      onDelete: "set null",
    }),
    providerId: uuidRef("provider_id").references(() => apiProviders.id, {
      onDelete: "set null",
    }),
    chatStyleId: uuidRef("chat_style_id").references(() => chatStyles.id, {
      onDelete: "set null",
    }),
    themeId: uuidRef("theme_id").references(() => themes.id, {
      onDelete: "set null",
    }),
    promptPresetId: uuidRef("prompt_preset_id").references(
      () => promptPresets.id,
      { onDelete: "set null" },
    ),
    personaId: uuidRef("persona_id").references(() => personas.id, {
      onDelete: "set null",
    }),
    outputSchemaId: uuidRef("output_schema_id").references(
      () => outputSchemas.id,
      { onDelete: "set null" },
    ),
    worldbookIds: json("worldbook_ids").$type<string[]>(),
    model: varchar("model", { length: 128 }),
    settings: json("settings").$type<SessionSettings>(),
    /** 当前分支的叶子消息，切换分支时更新 */
    activeLeafId: uuidRef("active_leaf_id"),
    lastMessageAt: datetime("last_message_at", { fsp: 3 }),
    messageCount: int("message_count", { unsigned: true })
      .notNull()
      .default(0),
    pinned: boolean("pinned").notNull().default(false),
    archived: boolean("archived").notNull().default(false),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    index("chat_sessions_user_recent_idx").on(t.userId, t.lastMessageAt),
    index("chat_sessions_user_archived_idx").on(t.userId, t.archived),
    index("chat_sessions_template_idx").on(t.templateId),
  ],
);

/**
 * 消息树：同一会话内通过 parentId/activeChildId 支持重新生成、分支与回溯。
 * content 保存原始文本，structured 保存按 outputSchema 解析后的结构化数据。
 */
export const messages = mysqlTable(
  "messages",
  {
    id: uuidPk(),
    sessionId: uuidRef("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    parentId: uuidRef("parent_id"),
    /** 当前选中的子消息，用于在多个重新生成结果间切换 */
    activeChildId: uuidRef("active_child_id"),
    role: mysqlEnum("role", ["system", "user", "assistant", "note"])
      .notNull()
      .default("assistant"),
    content: longtext("content").notNull(),
    rawContent: longtext("raw_content"),
    structured: json("structured").$type<unknown>(),
    metadata: json("metadata").$type<MessageMetadata>(),
    status: mysqlEnum("status", [
      "pending",
      "streaming",
      "complete",
      "error",
      "cancelled",
    ])
      .notNull()
      .default("complete"),
    tokensIn: int("tokens_in", { unsigned: true }),
    tokensOut: int("tokens_out", { unsigned: true }),
    ...timestamps(),
  },
  (t) => [
    index("messages_session_created_idx").on(t.sessionId, t.createdAt),
    index("messages_parent_idx").on(t.parentId),
    index("messages_session_status_idx").on(t.sessionId, t.status),
  ],
);

/** 会话记忆：永久记忆、隐藏记忆、手动笔记。 */
export const sessionMemories = mysqlTable(
  "session_memories",
  {
    id: uuidPk(),
    sessionId: uuidRef("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: mysqlEnum("kind", ["permanent", "hidden", "summary", "note"])
      .notNull()
      .default("note"),
    title: varchar("title", { length: 160 }),
    content: mediumtext("content").notNull(),
    importance: int("importance", { unsigned: true }).notNull().default(1),
    enabled: boolean("enabled").notNull().default(true),
    ...timestamps(),
  },
  (t) => [
    index("session_memories_session_idx").on(t.sessionId),
    index("session_memories_user_idx").on(t.userId),
  ],
);

/** 上下文压缩结果，按分支叶子节点绑定，切换分支时自动失效。 */
export const contextCompressions = mysqlTable(
  "context_compressions",
  {
    id: uuidPk(),
    sessionId: uuidRef("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    branchLeafId: uuidRef("branch_leaf_id").notNull(),
    fromMessageId: uuidRef("from_message_id"),
    toMessageId: uuidRef("to_message_id"),
    summary: mediumtext("summary").notNull(),
    tokensBefore: int("tokens_before", { unsigned: true }),
    tokensAfter: int("tokens_after", { unsigned: true }),
    messageCount: int("message_count", { unsigned: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("context_compressions_session_idx").on(t.sessionId),
    index("context_compressions_leaf_idx").on(t.sessionId, t.branchLeafId),
  ],
);
