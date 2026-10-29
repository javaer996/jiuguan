import {
  boolean,
  date,
  datetime,
  float,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  primaryKey,
  text,
  tinyint,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";
import { users } from "./auth";
import { createdAt, softDelete, timestamps, updatedAt, uuidPk, uuidRef } from "./common";
import type { TemplateSnapshot } from "./types";

export const plazaCategories = mysqlTable(
  "plaza_categories",
  {
    id: uuidPk(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 64 }).notNull(),
    description: varchar("description", { length: 255 }),
    icon: varchar("icon", { length: 64 }),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("plaza_categories_slug_uq").on(t.slug)],
);

export const tags = mysqlTable(
  "tags",
  {
    id: uuidPk(),
    slug: varchar("slug", { length: 64 }).notNull(),
    name: varchar("name", { length: 32 }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("tags_slug_uq").on(t.slug)],
);

/**
 * 广场模板：作者提交的不可变快照的索引。
 * 审核通过后 publishedVersionId 指向对应版本，克隆始终基于该版本。
 */
export const plazaTemplates = mysqlTable(
  "plaza_templates",
  {
    id: uuidPk(),
    authorId: uuidRef("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: uuidRef("category_id").references(() => plazaCategories.id, {
      onDelete: "set null",
    }),
    title: varchar("title", { length: 80 }).notNull(),
    summary: varchar("summary", { length: 500 }),
    coverUrl: varchar("cover_url", { length: 1024 }),
    status: mysqlEnum("status", [
      "draft",
      "pending",
      "published",
      "rejected",
      "archived",
    ])
      .notNull()
      .default("draft"),
    featured: boolean("featured").notNull().default(false),
    isOfficial: boolean("is_official").notNull().default(false),
    rejectReason: text("reject_reason"),
    publishedVersionId: uuidRef("published_version_id"),
    submittedAt: datetime("submitted_at", { fsp: 3 }),
    reviewedAt: datetime("reviewed_at", { fsp: 3 }),
    reviewedBy: uuidRef("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    cloneCount: int("clone_count", { unsigned: true }).notNull().default(0),
    likeCount: int("like_count", { unsigned: true }).notNull().default(0),
    viewCount: int("view_count", { unsigned: true }).notNull().default(0),
    ratingAvg: float("rating_avg").notNull().default(0),
    ratingCount: int("rating_count", { unsigned: true }).notNull().default(0),
    ...timestamps(),
    ...softDelete(),
  },
  (t) => [
    index("plaza_templates_status_idx").on(t.status, t.featured),
    index("plaza_templates_category_idx").on(t.categoryId, t.status),
    index("plaza_templates_author_idx").on(t.authorId),
    index("plaza_templates_clone_idx").on(t.cloneCount),
    index("plaza_templates_rating_idx").on(t.ratingAvg),
  ],
);

/** 模板版本：snapshot 为提交时的完整内容快照，永不原地修改。 */
export const plazaTemplateVersions = mysqlTable(
  "plaza_template_versions",
  {
    id: uuidPk(),
    templateId: uuidRef("template_id")
      .notNull()
      .references(() => plazaTemplates.id, { onDelete: "cascade" }),
    version: int("version", { unsigned: true }).notNull(),
    snapshot: json("snapshot").$type<TemplateSnapshot>().notNull(),
    changelog: varchar("changelog", { length: 500 }),
    createdBy: uuidRef("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("plaza_template_versions_template_version_uq").on(
      t.templateId,
      t.version,
    ),
  ],
);

export const plazaReviews = mysqlTable(
  "plaza_reviews",
  {
    id: uuidPk(),
    templateId: uuidRef("template_id")
      .notNull()
      .references(() => plazaTemplates.id, { onDelete: "cascade" }),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: tinyint("rating", { unsigned: true }).notNull(),
    content: text("content"),
    status: mysqlEnum("status", ["visible", "hidden"])
      .notNull()
      .default("visible"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("plaza_reviews_template_user_uq").on(t.templateId, t.userId),
    index("plaza_reviews_template_idx").on(t.templateId, t.status),
  ],
);

export const plazaTemplateTags = mysqlTable(
  "plaza_template_tags",
  {
    templateId: uuidRef("template_id")
      .notNull()
      .references(() => plazaTemplates.id, { onDelete: "cascade" }),
    tagId: uuidRef("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({
      name: "plaza_template_tags_pk",
      columns: [t.templateId, t.tagId],
    }),
    index("plaza_template_tags_tag_idx").on(t.tagId),
  ],
);

export const templateLikes = mysqlTable(
  "template_likes",
  {
    id: uuidPk(),
    templateId: uuidRef("template_id")
      .notNull()
      .references(() => plazaTemplates.id, { onDelete: "cascade" }),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("template_likes_template_user_uq").on(t.templateId, t.userId),
    index("template_likes_user_idx").on(t.userId),
  ],
);

/** 通用收藏：可收藏模板、角色、世界书、样式等。 */
export const favorites = mysqlTable(
  "favorites",
  {
    id: uuidPk(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetType: mysqlEnum("target_type", [
      "template",
      "character",
      "worldbook",
      "prompt_preset",
      "chat_style",
      "theme",
      "output_schema",
      "session",
    ]).notNull(),
    targetId: uuidRef("target_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("favorites_user_target_uq").on(
      t.userId,
      t.targetType,
      t.targetId,
    ),
    index("favorites_target_idx").on(t.targetType, t.targetId),
  ],
);

/** 广场行为事件，用于统计与推荐。 */
export const templateEvents = mysqlTable(
  "template_events",
  {
    id: uuidPk(),
    templateId: uuidRef("template_id")
      .notNull()
      .references(() => plazaTemplates.id, { onDelete: "cascade" }),
    userId: uuidRef("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    type: mysqlEnum("type", [
      "view",
      "clone",
      "like",
      "unlike",
      "favorite",
      "share",
    ]).notNull(),
    ip: varchar("ip", { length: 64 }),
    userAgent: varchar("user_agent", { length: 512 }),
    createdAt: createdAt(),
  },
  (t) => [
    index("template_events_template_created_idx").on(t.templateId, t.createdAt),
    index("template_events_template_type_idx").on(t.templateId, t.type),
    index("template_events_user_idx").on(t.userId),
  ],
);

/** 按天聚合的广场统计，避免实时扫事件表。 */
export const templateDailyStats = mysqlTable(
  "template_daily_stats",
  {
    id: uuidPk(),
    templateId: uuidRef("template_id")
      .notNull()
      .references(() => plazaTemplates.id, { onDelete: "cascade" }),
    day: date("day").notNull(),
    views: int("views", { unsigned: true }).notNull().default(0),
    clones: int("clones", { unsigned: true }).notNull().default(0),
    likes: int("likes", { unsigned: true }).notNull().default(0),
  },
  (t) => [
    uniqueIndex("template_daily_stats_template_day_uq").on(t.templateId, t.day),
  ],
);

/**
 * 克隆记录，保证同一用户重复“一键使用”同一模板时复用已生成的资产，
 * 不会产生重复的角色/世界书副本。
 */
export const templateClones = mysqlTable(
  "template_clones",
  {
    id: uuidPk(),
    templateId: uuidRef("template_id")
      .notNull()
      .references(() => plazaTemplates.id, { onDelete: "cascade" }),
    versionId: uuidRef("version_id").notNull(),
    userId: uuidRef("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** 最近一次克隆出来的会话 */
    sessionId: uuidRef("session_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("template_clones_template_user_uq").on(t.templateId, t.userId),
    index("template_clones_user_idx").on(t.userId),
  ],
);
