import {
  boolean,
  char,
  datetime,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { createdAt, dateTimeNow, softDelete, timestamps, uuidPk, uuidRef } from "./common";
import type { UserPreferences } from "./types";

export const users = mysqlTable(
  "users",
  {
    id: uuidPk(),
    username: varchar("username", { length: 32 }).notNull(),
    email: varchar("email", { length: 255 }),
    passwordHash: varchar("password_hash", { length: 100 }).notNull(),
    displayName: varchar("display_name", { length: 48 }).notNull(),
    avatarUrl: varchar("avatar_url", { length: 512 }),
    bio: varchar("bio", { length: 280 }),
    role: mysqlEnum("role", ["user", "admin"]).notNull().default("user"),
    status: mysqlEnum("status", ["active", "suspended", "deleted"])
      .notNull()
      .default("active"),
    lastLoginAt: datetime("last_login_at", { fsp: 3 }),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    uniqueIndex("users_username_uq").on(t.username),
    uniqueIndex("users_email_uq").on(t.email),
    index("users_status_idx").on(t.status),
    index("users_role_idx").on(t.role),
  ],
);

export const authSessions = mysqlTable(
  "auth_sessions",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 完整 JWT 的 SHA-256，数据库泄露时无法直接复用令牌 */
    tokenHash: char("token_hash", { length: 64 }).notNull(),
    userAgent: varchar("user_agent", { length: 512 }),
    ip: varchar("ip", { length: 64 }),
    expiresAt: datetime("expires_at", { fsp: 3 }).notNull(),
    lastUsedAt: dateTimeNow("last_used_at"),
    revokedAt: datetime("revoked_at", { fsp: 3 }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("auth_sessions_token_uq").on(t.tokenHash),
    index("auth_sessions_user_idx").on(t.userId),
    index("auth_sessions_expires_idx").on(t.expiresAt),
  ],
);

export const inviteCodes = mysqlTable(
  "invite_codes",
  {
    id: uuidPk(),
    code: varchar("code", { length: 32 }).notNull(),
    createdBy: uuidRef("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    maxUses: int("max_uses", { unsigned: true }).notNull().default(1),
    usedCount: int("used_count", { unsigned: true }).notNull().default(0),
    expiresAt: datetime("expires_at", { fsp: 3 }),
    disabled: boolean("disabled").notNull().default(false),
    note: varchar("note", { length: 255 }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("invite_codes_code_uq").on(t.code),
    index("invite_codes_created_by_idx").on(t.createdBy),
  ],
);

export const inviteCodeUses = mysqlTable(
  "invite_code_uses",
  {
    id: uuidPk(),
    inviteCodeId: uuidRef("invite_code_id")
      .notNull()
      .references(() => inviteCodes.id, { onDelete: "cascade" }),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ip: varchar("ip", { length: 64 }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("invite_code_uses_code_user_uq").on(t.inviteCodeId, t.userId),
    index("invite_code_uses_user_idx").on(t.userId),
  ],
);

export const userSettings = mysqlTable("user_settings", {
  userId: uuidRef("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  theme: varchar("theme", { length: 16 }).notNull().default("dark"),
  locale: varchar("locale", { length: 16 }).notNull().default("zh-CN"),
  defaultProviderId: uuidRef("default_provider_id"),
  defaultTemplateId: uuidRef("default_template_id"),
  defaultPromptPresetId: uuidRef("default_prompt_preset_id"),
  defaultChatStyleId: uuidRef("default_chat_style_id"),
  defaultOutputSchemaId: uuidRef("default_output_schema_id"),
  defaultPersonaId: uuidRef("default_persona_id"),
  preferences: json("preferences").$type<UserPreferences>(),
  ...timestamps(),
});

export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: char("token_hash", { length: 64 }).notNull(),
    expiresAt: datetime("expires_at", { fsp: 3 }).notNull(),
    usedAt: datetime("used_at", { fsp: 3 }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("password_reset_tokens_hash_uq").on(t.tokenHash),
    index("password_reset_tokens_user_idx").on(t.userId),
  ],
);
