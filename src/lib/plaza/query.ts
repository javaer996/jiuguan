import {
  and,
  asc,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  like,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  favorites,
  plazaCategories,
  plazaReviews,
  plazaTemplates,
  plazaTemplateTags,
  plazaTemplateVersions,
  tags,
  templateLikes,
  users,
} from "@/db/schema";
import type { TemplateSnapshot } from "@/db/schema/types";
import type {
  AdminPlazaSubmissionDTO,
  PlazaCategoryDTO,
  PlazaReviewDTO,
  PlazaStatus,
  PlazaSubmissionDTO,
  PlazaTemplateCardDTO,
  PlazaTemplateDetailDTO,
} from "@/lib/types/plaza";
import { likePattern } from "@/lib/content/query";

type Viewer = { id: string; role: "user" | "admin" };

export type PlazaListSort = "hot" | "new" | "rating";

export type PlazaListParams = {
  viewerId?: string | null;
  favoritedBy?: string | null;
  category?: string | null;
  tag?: string | null;
  q?: string | null;
  sort?: PlazaListSort;
  limit?: number;
  offset?: number;
};

export type PlazaListResult = {
  items: PlazaTemplateCardDTO[];
  total: number;
};

/** 广场公开内容的统一口径，分类计数等地方复用。 */
export const publicConditions = [
  isNull(plazaTemplates.deletedAt),
  isNotNull(plazaTemplates.publishedVersionId),
  ne(plazaTemplates.status, "archived"),
];

function authorOf(row: {
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
}) {
  return {
    id: row.authorId,
    displayName: row.authorName,
    avatarUrl: row.authorAvatar,
  };
}

function categoryOf(row: {
  categoryId: string | null;
  categorySlug: string | null;
  categoryName: string | null;
}) {
  return row.categoryId && row.categorySlug && row.categoryName
    ? {
        id: row.categoryId,
        slug: row.categorySlug,
        name: row.categoryName,
      }
    : null;
}

async function loadTags(templateIds: string[]) {
  const map = new Map<string, string[]>();
  if (templateIds.length === 0) return map;

  const rows = await getDb()
    .select({
      templateId: plazaTemplateTags.templateId,
      name: tags.name,
      slug: tags.slug,
    })
    .from(plazaTemplateTags)
    .innerJoin(tags, eq(tags.id, plazaTemplateTags.tagId))
    .where(inArray(plazaTemplateTags.templateId, templateIds))
    .orderBy(asc(tags.name));

  for (const row of rows) {
    const list = map.get(row.templateId);
    if (list) list.push(row.name);
    else map.set(row.templateId, [row.name]);
  }
  return map;
}

async function loadViewerState(
  viewerId: string | null | undefined,
  templateIds: string[],
) {
  const liked = new Set<string>();
  const favorited = new Set<string>();
  if (!viewerId || templateIds.length === 0) return { liked, favorited };

  const db = getDb();
  const [likeRows, favoriteRows] = await Promise.all([
    db
      .select({ templateId: templateLikes.templateId })
      .from(templateLikes)
      .where(
        and(
          eq(templateLikes.userId, viewerId),
          inArray(templateLikes.templateId, templateIds),
        ),
      ),
    db
      .select({ templateId: favorites.targetId })
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, viewerId),
          eq(favorites.targetType, "template"),
          inArray(favorites.targetId, templateIds),
        ),
      ),
  ]);

  for (const row of likeRows) liked.add(row.templateId);
  for (const row of favoriteRows) favorited.add(row.templateId);
  return { liked, favorited };
}

export async function listPlazaTemplates(
  params: PlazaListParams,
): Promise<PlazaListResult> {
  const db = getDb();
  const limit = Math.min(Math.max(params.limit ?? 24, 1), 60);
  const offset = Math.max(params.offset ?? 0, 0);

  const conditions = [...publicConditions];
  if (params.favoritedBy) {
    conditions.push(
      inArray(
        plazaTemplates.id,
        db
          .select({ id: favorites.targetId })
          .from(favorites)
          .where(
            and(
              eq(favorites.userId, params.favoritedBy),
              eq(favorites.targetType, "template"),
            ),
          ),
      ),
    );
  }
  if (params.category) {
    conditions.push(eq(plazaCategories.slug, params.category));
  }
  if (params.q?.trim()) {
    const pattern = likePattern(params.q.trim());
    const search = or(
      like(plazaTemplates.title, pattern),
      like(plazaTemplates.summary, pattern),
    );
    if (search) conditions.push(search);
  }
  if (params.tag) {
    const tagged = await db
      .select({ templateId: plazaTemplateTags.templateId })
      .from(plazaTemplateTags)
      .innerJoin(tags, eq(tags.id, plazaTemplateTags.tagId))
      .where(or(eq(tags.slug, params.tag), eq(tags.name, params.tag)));
    if (tagged.length === 0) return { items: [], total: 0 };
    conditions.push(
      inArray(
        plazaTemplates.id,
        tagged.map((row) => row.templateId),
      ),
    );
  }

  const where = and(...conditions);
  const orderBy =
    params.sort === "new"
      ? [
          desc(plazaTemplates.featured),
          desc(plazaTemplates.reviewedAt),
          desc(plazaTemplates.createdAt),
        ]
      : params.sort === "rating"
        ? [
            desc(plazaTemplates.ratingAvg),
            desc(plazaTemplates.ratingCount),
            desc(plazaTemplates.featured),
          ]
        : [
            desc(plazaTemplates.featured),
            desc(plazaTemplates.cloneCount),
            desc(plazaTemplates.likeCount),
            desc(plazaTemplates.viewCount),
          ];

  const rows = await db
    .select({
      id: plazaTemplates.id,
      title: plazaTemplates.title,
      summary: plazaTemplates.summary,
      coverUrl: plazaTemplates.coverUrl,
      isOfficial: plazaTemplates.isOfficial,
      featured: plazaTemplates.featured,
      status: plazaTemplates.status,
      publishedVersionId: plazaTemplates.publishedVersionId,
      cloneCount: plazaTemplates.cloneCount,
      likeCount: plazaTemplates.likeCount,
      viewCount: plazaTemplates.viewCount,
      ratingAvg: plazaTemplates.ratingAvg,
      ratingCount: plazaTemplates.ratingCount,
      reviewedAt: plazaTemplates.reviewedAt,
      updatedAt: plazaTemplates.updatedAt,
      categoryId: plazaCategories.id,
      categorySlug: plazaCategories.slug,
      categoryName: plazaCategories.name,
      authorId: users.id,
      authorName: users.displayName,
      authorAvatar: users.avatarUrl,
    })
    .from(plazaTemplates)
    .leftJoin(
      plazaCategories,
      eq(plazaCategories.id, plazaTemplates.categoryId),
    )
    .innerJoin(users, eq(users.id, plazaTemplates.authorId))
    .where(where)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(plazaTemplates)
    .leftJoin(
      plazaCategories,
      eq(plazaCategories.id, plazaTemplates.categoryId),
    )
    .where(where);

  const ids = rows.map((row) => row.id);
  const [tagMap, viewerState] = await Promise.all([
    loadTags(ids),
    loadViewerState(params.viewerId, ids),
  ]);

  return {
    total: countRow?.total ?? 0,
    items: rows.map((row) => ({
      id: row.id,
      title: row.title,
      summary: row.summary,
      coverUrl: row.coverUrl,
      category: categoryOf(row),
      tags: tagMap.get(row.id) ?? [],
      author: authorOf(row),
      isOfficial: row.isOfficial,
      featured: row.featured,
      status: row.status,
      published: Boolean(row.publishedVersionId),
      cloneCount: row.cloneCount,
      likeCount: row.likeCount,
      viewCount: row.viewCount,
      ratingAvg: row.ratingAvg,
      ratingCount: row.ratingCount,
      publishedAt: row.reviewedAt?.toISOString() ?? null,
      updatedAt: row.updatedAt.toISOString(),
      liked: viewerState.liked.has(row.id),
      favorited: viewerState.favorited.has(row.id),
    })),
  };
}

async function loadReviewRows(templateId: string, viewerId?: string | null) {
  const rows = await getDb()
    .select({
      id: plazaReviews.id,
      rating: plazaReviews.rating,
      content: plazaReviews.content,
      createdAt: plazaReviews.createdAt,
      authorId: users.id,
      authorName: users.displayName,
      authorAvatar: users.avatarUrl,
    })
    .from(plazaReviews)
    .innerJoin(users, eq(users.id, plazaReviews.userId))
    .where(
      and(
        eq(plazaReviews.templateId, templateId),
        eq(plazaReviews.status, "visible"),
      ),
    )
    .orderBy(desc(plazaReviews.createdAt))
    .limit(50);

  return rows.map<PlazaReviewDTO>((row) => ({
    id: row.id,
    rating: row.rating,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
    author: authorOf(row),
    mine: viewerId === row.authorId,
  }));
}

export async function getPlazaTemplateDetail(
  id: string,
  viewer?: Viewer | null,
): Promise<PlazaTemplateDetailDTO | null> {
  const db = getDb();
  const [row] = await db
    .select({
      id: plazaTemplates.id,
      title: plazaTemplates.title,
      summary: plazaTemplates.summary,
      coverUrl: plazaTemplates.coverUrl,
      isOfficial: plazaTemplates.isOfficial,
      featured: plazaTemplates.featured,
      status: plazaTemplates.status,
      cloneCount: plazaTemplates.cloneCount,
      likeCount: plazaTemplates.likeCount,
      viewCount: plazaTemplates.viewCount,
      ratingAvg: plazaTemplates.ratingAvg,
      ratingCount: plazaTemplates.ratingCount,
      rejectReason: plazaTemplates.rejectReason,
      reviewedAt: plazaTemplates.reviewedAt,
      updatedAt: plazaTemplates.updatedAt,
      publishedVersionId: plazaTemplates.publishedVersionId,
      authorId: users.id,
      authorName: users.displayName,
      authorAvatar: users.avatarUrl,
      categoryId: plazaCategories.id,
      categorySlug: plazaCategories.slug,
      categoryName: plazaCategories.name,
    })
    .from(plazaTemplates)
    .leftJoin(
      plazaCategories,
      eq(plazaCategories.id, plazaTemplates.categoryId),
    )
    .innerJoin(users, eq(users.id, plazaTemplates.authorId))
    .where(and(eq(plazaTemplates.id, id), isNull(plazaTemplates.deletedAt)))
    .limit(1);

  if (!row) return null;

  const isOwner = viewer?.id === row.authorId;
  const isAdmin = viewer?.role === "admin";
  if (!row.publishedVersionId && !isOwner && !isAdmin) return null;
  if (row.status === "archived" && !isOwner && !isAdmin) return null;

  const [version] = row.publishedVersionId
    ? await db
        .select()
        .from(plazaTemplateVersions)
        .where(eq(plazaTemplateVersions.id, row.publishedVersionId))
        .limit(1)
    : await db
        .select()
        .from(plazaTemplateVersions)
        .where(eq(plazaTemplateVersions.templateId, id))
        .orderBy(desc(plazaTemplateVersions.version))
        .limit(1);

  const [tagMap, viewerState, reviews] = await Promise.all([
    loadTags([id]),
    loadViewerState(viewer?.id, [id]),
    loadReviewRows(id, viewer?.id),
  ]);

  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    coverUrl: row.coverUrl,
    category: categoryOf(row),
    tags: tagMap.get(id) ?? [],
    author: authorOf(row),
    isOfficial: row.isOfficial,
    featured: row.featured,
    status: row.status,
    published: Boolean(row.publishedVersionId),
    cloneCount: row.cloneCount,
    likeCount: row.likeCount,
    viewCount: row.viewCount,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    publishedAt: row.reviewedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
    liked: viewerState.liked.has(id),
    favorited: viewerState.favorited.has(id),
    snapshot: version?.snapshot ?? null,
    version: version?.version ?? null,
    changelog: version?.changelog ?? null,
    rejectReason: row.rejectReason,
    reviews,
    myReview: reviews.find((review) => review.mine) ?? null,
  };
}

export async function listPlazaCategories(): Promise<PlazaCategoryDTO[]> {
  const db = getDb();
  const [categoryRows, countRows] = await Promise.all([
    db
      .select()
      .from(plazaCategories)
      .orderBy(asc(plazaCategories.sortOrder), asc(plazaCategories.name)),
    db
      .select({
        categoryId: plazaTemplates.categoryId,
        total: sql<number>`count(*)`.mapWith(Number),
      })
      .from(plazaTemplates)
      .where(and(...publicConditions))
      .groupBy(plazaTemplates.categoryId),
  ]);

  const counts = new Map(
    countRows
      .filter((row) => row.categoryId)
      .map((row) => [row.categoryId!, row.total]),
  );

  return categoryRows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sortOrder,
    templateCount: counts.get(row.id) ?? 0,
  }));
}

export async function getPublishedVersion(id: string) {
  const db = getDb();
  const [row] = await db
    .select({ template: plazaTemplates })
    .from(plazaTemplates)
    .where(
      and(
        eq(plazaTemplates.id, id),
        isNull(plazaTemplates.deletedAt),
        isNotNull(plazaTemplates.publishedVersionId),
        ne(plazaTemplates.status, "archived"),
      ),
    )
    .limit(1);

  if (!row?.template.publishedVersionId) return null;

  const [version] = await db
    .select()
    .from(plazaTemplateVersions)
    .where(eq(plazaTemplateVersions.id, row.template.publishedVersionId))
    .limit(1);

  if (!version) return null;
  return { template: row.template, version };
}

async function loadLatestVersions(templateIds: string[]) {
  const map = new Map<
    string,
    {
      id: string;
      version: number;
      snapshot: TemplateSnapshot;
      changelog: string | null;
    }
  >();
  if (templateIds.length === 0) return map;

  const rows = await getDb()
    .select({
      id: plazaTemplateVersions.id,
      templateId: plazaTemplateVersions.templateId,
      version: plazaTemplateVersions.version,
      snapshot: plazaTemplateVersions.snapshot,
      changelog: plazaTemplateVersions.changelog,
    })
    .from(plazaTemplateVersions)
    .where(inArray(plazaTemplateVersions.templateId, templateIds))
    .orderBy(desc(plazaTemplateVersions.version));

  for (const row of rows) {
    if (!map.has(row.templateId)) {
      map.set(row.templateId, {
        id: row.id,
        version: row.version,
        snapshot: row.snapshot,
        changelog: row.changelog,
      });
    }
  }
  return map;
}

function submissionDto(
  row: {
    id: string;
    title: string;
    summary: string | null;
    status: PlazaStatus;
    rejectReason: string | null;
    isOfficial: boolean;
    featured: boolean;
    coverUrl: string | null;
    cloneCount: number;
    likeCount: number;
    viewCount: number;
    ratingAvg: number;
    ratingCount: number;
    publishedVersionId: string | null;
    submittedAt: Date | null;
    reviewedAt: Date | null;
    updatedAt: Date;
    categoryId: string | null;
    categorySlug: string | null;
    categoryName: string | null;
  },
  tagsList: string[],
  latestVersion: number | null,
  publishedVersion: number | null,
): PlazaSubmissionDTO {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    status: row.status,
    rejectReason: row.rejectReason,
    isOfficial: row.isOfficial,
    featured: row.featured,
    coverUrl: row.coverUrl,
    category: categoryOf(row),
    tags: tagsList,
    cloneCount: row.cloneCount,
    likeCount: row.likeCount,
    viewCount: row.viewCount,
    ratingAvg: row.ratingAvg,
    ratingCount: row.ratingCount,
    latestVersion,
    publishedVersion,
    submittedAt: row.submittedAt?.toISOString() ?? null,
    reviewedAt: row.reviewedAt?.toISOString() ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listMySubmissions(
  userId: string,
): Promise<PlazaSubmissionDTO[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: plazaTemplates.id,
      title: plazaTemplates.title,
      summary: plazaTemplates.summary,
      status: plazaTemplates.status,
      rejectReason: plazaTemplates.rejectReason,
      isOfficial: plazaTemplates.isOfficial,
      featured: plazaTemplates.featured,
      coverUrl: plazaTemplates.coverUrl,
      cloneCount: plazaTemplates.cloneCount,
      likeCount: plazaTemplates.likeCount,
      viewCount: plazaTemplates.viewCount,
      ratingAvg: plazaTemplates.ratingAvg,
      ratingCount: plazaTemplates.ratingCount,
      publishedVersionId: plazaTemplates.publishedVersionId,
      submittedAt: plazaTemplates.submittedAt,
      reviewedAt: plazaTemplates.reviewedAt,
      updatedAt: plazaTemplates.updatedAt,
      categoryId: plazaCategories.id,
      categorySlug: plazaCategories.slug,
      categoryName: plazaCategories.name,
    })
    .from(plazaTemplates)
    .leftJoin(
      plazaCategories,
      eq(plazaCategories.id, plazaTemplates.categoryId),
    )
    .where(
      and(
        eq(plazaTemplates.authorId, userId),
        isNull(plazaTemplates.deletedAt),
      ),
    )
    .orderBy(desc(plazaTemplates.updatedAt))
    .limit(100);

  const ids = rows.map((row) => row.id);
  const [tagMap, latestMap, versionRows] = await Promise.all([
    loadTags(ids),
    loadLatestVersions(ids),
    ids.length > 0
      ? db
          .select({
            id: plazaTemplateVersions.id,
            templateId: plazaTemplateVersions.templateId,
            version: plazaTemplateVersions.version,
          })
          .from(plazaTemplateVersions)
          .where(inArray(plazaTemplateVersions.templateId, ids))
      : Promise.resolve([]),
  ]);

  const versionNumberById = new Map(
    versionRows.map((row) => [row.id, row.version]),
  );

  return rows.map((row) =>
    submissionDto(
      row,
      tagMap.get(row.id) ?? [],
      latestMap.get(row.id)?.version ?? null,
      row.publishedVersionId
        ? (versionNumberById.get(row.publishedVersionId) ?? null)
        : null,
    ),
  );
}

export async function countPlazaSubmissions(): Promise<
  Record<PlazaStatus, number>
> {
  const rows = await getDb()
    .select({
      status: plazaTemplates.status,
      total: sql<number>`count(*)`.mapWith(Number),
    })
    .from(plazaTemplates)
    .where(isNull(plazaTemplates.deletedAt))
    .groupBy(plazaTemplates.status);

  const counts: Record<PlazaStatus, number> = {
    draft: 0,
    pending: 0,
    published: 0,
    rejected: 0,
    archived: 0,
  };
  for (const row of rows) counts[row.status] = row.total;
  return counts;
}

export async function listAdminSubmissions(
  status: PlazaStatus | "all" = "pending",
): Promise<AdminPlazaSubmissionDTO[]> {
  const db = getDb();
  const conditions = [isNull(plazaTemplates.deletedAt)];
  if (status !== "all") conditions.push(eq(plazaTemplates.status, status));

  const rows = await db
    .select({
      id: plazaTemplates.id,
      title: plazaTemplates.title,
      summary: plazaTemplates.summary,
      status: plazaTemplates.status,
      rejectReason: plazaTemplates.rejectReason,
      isOfficial: plazaTemplates.isOfficial,
      featured: plazaTemplates.featured,
      coverUrl: plazaTemplates.coverUrl,
      cloneCount: plazaTemplates.cloneCount,
      likeCount: plazaTemplates.likeCount,
      viewCount: plazaTemplates.viewCount,
      ratingAvg: plazaTemplates.ratingAvg,
      ratingCount: plazaTemplates.ratingCount,
      publishedVersionId: plazaTemplates.publishedVersionId,
      submittedAt: plazaTemplates.submittedAt,
      reviewedAt: plazaTemplates.reviewedAt,
      updatedAt: plazaTemplates.updatedAt,
      categoryId: plazaCategories.id,
      categorySlug: plazaCategories.slug,
      categoryName: plazaCategories.name,
      authorId: users.id,
      authorName: users.displayName,
      authorAvatar: users.avatarUrl,
    })
    .from(plazaTemplates)
    .leftJoin(
      plazaCategories,
      eq(plazaCategories.id, plazaTemplates.categoryId),
    )
    .innerJoin(users, eq(users.id, plazaTemplates.authorId))
    .where(and(...conditions))
    .orderBy(
      status === "pending"
        ? asc(plazaTemplates.submittedAt)
        : desc(plazaTemplates.reviewedAt),
    )
    .limit(100);

  const ids = rows.map((row) => row.id);
  const [tagMap, latestMap] = await Promise.all([
    loadTags(ids),
    loadLatestVersions(ids),
  ]);

  return rows.map((row) => {
    const latest = latestMap.get(row.id);
    return {
      ...submissionDto(
        row,
        tagMap.get(row.id) ?? [],
        latest?.version ?? null,
        null,
      ),
      author: authorOf(row),
      snapshot: latest?.snapshot ?? null,
      changelog: latest?.changelog ?? null,
      published: Boolean(row.publishedVersionId),
    };
  });
}
