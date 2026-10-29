import {
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  varchar,
} from "drizzle-orm/mysql-core";
import { users } from "./auth";
import { apiProviders } from "./providers";
import { chatSessions } from "./chat";
import { createdAt, updatedAt, uuidPk, uuidRef } from "./common";

/** 每次 AI 调用一条记录，用于用量统计与故障排查。 */
export const usageLogs = mysqlTable(
  "usage_logs",
  {
    id: uuidPk(),
    userId: uuidRef("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    providerId: uuidRef("provider_id").references(() => apiProviders.id, {
      onDelete: "set null",
    }),
    sessionId: uuidRef("session_id").references(() => chatSessions.id, {
      onDelete: "set null",
    }),
    messageId: uuidRef("message_id"),
    kind: mysqlEnum("kind", [
      "chat",
      "assist",
      "title",
      "summary",
      "memory",
      "embedding",
    ])
      .notNull()
      .default("chat"),
    model: varchar("model", { length: 128 }),
    promptTokens: int("prompt_tokens", { unsigned: true }),
    completionTokens: int("completion_tokens", { unsigned: true }),
    totalTokens: int("total_tokens", { unsigned: true }),
    latencyMs: int("latency_ms", { unsigned: true }),
    status: mysqlEnum("status", ["success", "error", "cancelled"])
      .notNull()
      .default("success"),
    errorCode: varchar("error_code", { length: 64 }),
    createdAt: createdAt(),
  },
  (t) => [
    index("usage_logs_user_created_idx").on(t.userId, t.createdAt),
    index("usage_logs_provider_created_idx").on(t.providerId, t.createdAt),
    index("usage_logs_session_idx").on(t.sessionId),
  ],
);

/** 管理操作审计日志。 */
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: uuidPk(),
    actorId: uuidRef("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 64 }).notNull(),
    targetType: varchar("target_type", { length: 32 }),
    targetId: uuidRef("target_id"),
    detail: json("detail").$type<Record<string, unknown>>(),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_actor_created_idx").on(t.actorId, t.createdAt),
    index("audit_logs_action_created_idx").on(t.action, t.createdAt),
  ],
);

/** 全局系统设置（注册开关、共享 API 默认值、公告等）。 */
export const systemSettings = mysqlTable("system_settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: json("value").$type<unknown>(),
  updatedBy: uuidRef("updated_by").references(() => users.id, {
    onDelete: "set null",
  }),
  updatedAt: updatedAt(),
});
