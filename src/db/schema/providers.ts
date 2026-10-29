import {
  boolean,
  datetime,
  float,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { users } from "./auth";
import { softDelete, timestamps, uuidPk, uuidRef } from "./common";
import type { ProviderCapabilities } from "./types";

/**
 * OpenAI 兼容的 API 供应商配置。
 * 用户自己创建的供应商 isShared=false；管理员共享的供应商 isShared=true 并通过 grants 授权。
 */
export const apiProviders = mysqlTable(
  "api_providers",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 64 }).notNull(),
    baseUrl: varchar("base_url", { length: 512 }).notNull(),
    /** AEAD 加密后的密钥，永不明文落库 */
    apiKeyEnc: text("api_key_enc").notNull(),
    apiKeyHint: varchar("api_key_hint", { length: 16 }),
    model: varchar("model", { length: 128 }).notNull(),
    models: json("models").$type<string[]>(),
    temperature: float("temperature").notNull().default(0.85),
    topP: float("top_p").notNull().default(1),
    maxTokens: int("max_tokens", { unsigned: true }).notNull().default(2048),
    presencePenalty: float("presence_penalty").notNull().default(0),
    frequencyPenalty: float("frequency_penalty").notNull().default(0),
    contextWindow: int("context_window", { unsigned: true })
      .notNull()
      .default(8192),
    capabilities: json("capabilities").$type<ProviderCapabilities>(),
    extraHeaders: json("extra_headers").$type<Record<string, string>>(),
    isShared: boolean("is_shared").notNull().default(false),
    isDefault: boolean("is_default").notNull().default(false),
    status: mysqlEnum("status", ["active", "disabled"])
      .notNull()
      .default("active"),
    lastCheckedAt: datetime("last_checked_at", { fsp: 3 }),
    lastCheckStatus: varchar("last_check_status", { length: 16 }),
    lastCheckMessage: varchar("last_check_message", { length: 512 }),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    index("api_providers_user_idx").on(t.userId),
    index("api_providers_shared_idx").on(t.isShared, t.status),
  ],
);

/** 管理员把共享供应商授权给具体用户。 */
export const apiProviderGrants = mysqlTable(
  "api_provider_grants",
  {
    id: uuidPk(),
    providerId: uuidRef("provider_id")
      .notNull()
      .references(() => apiProviders.id, { onDelete: "cascade" }),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    grantedBy: uuidRef("granted_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("api_provider_grants_provider_user_uq").on(
      t.providerId,
      t.userId,
    ),
    index("api_provider_grants_user_idx").on(t.userId),
  ],
);
