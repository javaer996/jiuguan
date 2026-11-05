import { and, asc, eq, isNull, ne, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { plazaCategories, plazaTemplates } from "@/db/schema";
import { ApiError } from "@/lib/api";
import type { AdminPlazaCategoryDTO } from "@/lib/types/plaza";
import type {
  AdminPlazaCategoryCreateInput,
  AdminPlazaCategoryUpdateInput,
} from "@/lib/validation/admin";
import {
  randomCategorySlug,
  randomSlugSuffix,
  slugifyCategoryName,
} from "./category-slug";
import { publicConditions } from "./query";

type CategoryRow = typeof plazaCategories.$inferSelect;

type CategoryCounts = {
  publicCount: number;
  totalCount: number;
};

function toCategoryDTO(
  row: CategoryRow,
  counts?: CategoryCounts,
): AdminPlazaCategoryDTO {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    icon: row.icon,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    publicTemplateCount: counts?.publicCount ?? 0,
    totalTemplateCount: counts?.totalCount ?? 0,
  };
}

async function getCategoryCounts(categoryId: string): Promise<CategoryCounts> {
  const db = getDb();
  const [totalRows, publicRows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(plazaTemplates)
      .where(
        and(
          eq(plazaTemplates.categoryId, categoryId),
          isNull(plazaTemplates.deletedAt),
        ),
      ),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(plazaTemplates)
      .where(
        and(eq(plazaTemplates.categoryId, categoryId), ...publicConditions),
      ),
  ]);

  return {
    publicCount: publicRows[0]?.total ?? 0,
    totalCount: totalRows[0]?.total ?? 0,
  };
}

export async function listAdminPlazaCategories(): Promise<
  AdminPlazaCategoryDTO[]
> {
  const db = getDb();
  const [rows, totalRows, publicRows] = await Promise.all([
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
      .where(isNull(plazaTemplates.deletedAt))
      .groupBy(plazaTemplates.categoryId),
    db
      .select({
        categoryId: plazaTemplates.categoryId,
        total: sql<number>`count(*)`.mapWith(Number),
      })
      .from(plazaTemplates)
      .where(and(...publicConditions))
      .groupBy(plazaTemplates.categoryId),
  ]);

  const totals = new Map(
    totalRows.flatMap((row) =>
      row.categoryId ? [[row.categoryId, row.total] as const] : [],
    ),
  );
  const publics = new Map(
    publicRows.flatMap((row) =>
      row.categoryId ? [[row.categoryId, row.total] as const] : [],
    ),
  );

  return rows.map((row) =>
    toCategoryDTO(row, {
      publicCount: publics.get(row.id) ?? 0,
      totalCount: totals.get(row.id) ?? 0,
    }),
  );
}

export async function countUncategorizedPlazaTemplates(): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(plazaTemplates)
    .where(
      and(
        isNull(plazaTemplates.deletedAt),
        isNull(plazaTemplates.categoryId),
      ),
    );
  return row?.total ?? 0;
}

async function assertNameAvailable(name: string, excludeId?: string) {
  const conditions = [eq(plazaCategories.name, name)];
  if (excludeId) conditions.push(ne(plazaCategories.id, excludeId));

  const [existing] = await getDb()
    .select({ id: plazaCategories.id })
    .from(plazaCategories)
    .where(and(...conditions))
    .limit(1);

  if (existing) {
    throw new ApiError(
      409,
      "CATEGORY_NAME_EXISTS",
      "已有同名分类，请换一个名称",
    );
  }
}

async function assertSlugAvailable(slug: string) {
  const [existing] = await getDb()
    .select({ id: plazaCategories.id })
    .from(plazaCategories)
    .where(eq(plazaCategories.slug, slug))
    .limit(1);

  if (existing) {
    throw new ApiError(
      409,
      "CATEGORY_SLUG_EXISTS",
      "这个标识已被使用，请换一个",
    );
  }
}

async function generateAvailableSlug(name: string): Promise<string> {
  const base = slugifyCategoryName(name);
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = base
      ? `${base}-${randomSlugSuffix()}`
      : randomCategorySlug();
    const [existing] = await getDb()
      .select({ id: plazaCategories.id })
      .from(plazaCategories)
      .where(eq(plazaCategories.slug, candidate))
      .limit(1);
    if (!existing) return candidate;
  }

  throw new ApiError(
    409,
    "CATEGORY_SLUG_CONFLICT",
    "自动生成标识失败，请手动填写一个标识",
  );
}

async function nextSortOrder(): Promise<number> {
  const [row] = await getDb()
    .select({
      max: sql<number>`coalesce(max(${plazaCategories.sortOrder}), 0)`.mapWith(
        Number,
      ),
    })
    .from(plazaCategories);
  return Math.min((row?.max ?? 0) + 10, 9999);
}

export async function createPlazaCategory(
  input: AdminPlazaCategoryCreateInput,
): Promise<AdminPlazaCategoryDTO> {
  const db = getDb();
  await assertNameAvailable(input.name);

  if (input.slug) await assertSlugAvailable(input.slug);
  const slug = input.slug ?? (await generateAvailableSlug(input.name));
  const sortOrder = input.sortOrder ?? (await nextSortOrder());
  const id = uuidv7();

  await db.insert(plazaCategories).values({
    id,
    name: input.name,
    slug,
    description: input.description?.trim() || null,
    icon: input.icon ?? null,
    sortOrder,
  });

  const [row] = await db
    .select()
    .from(plazaCategories)
    .where(eq(plazaCategories.id, id))
    .limit(1);

  if (!row) {
    throw new ApiError(500, "CATEGORY_CREATE_FAILED", "分类创建失败");
  }
  return toCategoryDTO(row);
}

export async function updatePlazaCategory(
  id: string,
  input: AdminPlazaCategoryUpdateInput,
): Promise<AdminPlazaCategoryDTO> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(plazaCategories)
    .where(eq(plazaCategories.id, id))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, "CATEGORY_NOT_FOUND", "分类不存在");
  }

  if (input.name !== undefined && input.name !== existing.name) {
    await assertNameAvailable(input.name, id);
  }

  const patch: Partial<typeof plazaCategories.$inferInsert> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.description !== undefined) {
    patch.description = input.description?.trim() || null;
  }
  if (input.icon !== undefined) patch.icon = input.icon ?? null;
  if (input.sortOrder !== undefined) patch.sortOrder = input.sortOrder;

  if (Object.keys(patch).length > 0) {
    await db
      .update(plazaCategories)
      .set(patch)
      .where(eq(plazaCategories.id, id));
  }

  const [row] = await db
    .select()
    .from(plazaCategories)
    .where(eq(plazaCategories.id, id))
    .limit(1);

  if (!row) {
    throw new ApiError(404, "CATEGORY_NOT_FOUND", "分类不存在");
  }
  return toCategoryDTO(row, await getCategoryCounts(id));
}

export type DeletePlazaCategoryResult = {
  name: string;
  slug: string;
  affectedTemplateCount: number;
  publicTemplateCount: number;
};

export async function deletePlazaCategory(
  id: string,
): Promise<DeletePlazaCategoryResult> {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(plazaCategories)
    .where(eq(plazaCategories.id, id))
    .limit(1);

  if (!existing) {
    throw new ApiError(404, "CATEGORY_NOT_FOUND", "分类不存在");
  }

  const counts = await getCategoryCounts(id);
  await db.delete(plazaCategories).where(eq(plazaCategories.id, id));

  return {
    name: existing.name,
    slug: existing.slug,
    affectedTemplateCount: counts.totalCount,
    publicTemplateCount: counts.publicCount,
  };
}
