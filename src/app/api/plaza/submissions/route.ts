import { and, desc, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import {
  plazaCategories,
  plazaTemplates,
  plazaTemplateTags,
  plazaTemplateVersions,
  tags,
} from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { buildTemplateSnapshot } from "@/lib/plaza/snapshot";
import { listMySubmissions } from "@/lib/plaza/query";
import { plazaSubmitSchema } from "@/lib/validation/plaza";

function tagSlug(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .slice(0, 64);
  return slug || null;
}

function safeCoverUrl(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)) {
    return trimmed.slice(0, 1024);
  }
  throw new ApiError(
    400,
    "INVALID_COVER",
    "封面地址必须是站内路径或 http(s) 链接",
  );
}

type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0];

async function attachTags(tx: Tx, templateId: string, names: string[]) {
  const unique = new Map<string, string>();
  for (const name of names) {
    const trimmed = name.trim().slice(0, 32);
    if (!trimmed) continue;
    const slug = tagSlug(trimmed);
    if (slug && !unique.has(slug)) unique.set(slug, trimmed);
    if (unique.size >= 8) break;
  }

  await tx
    .delete(plazaTemplateTags)
    .where(eq(plazaTemplateTags.templateId, templateId));

  if (unique.size === 0) return;

  const tagIds: string[] = [];
  for (const [slug, name] of unique) {
    const [existing] = await tx
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);

    if (existing) {
      tagIds.push(existing.id);
    } else {
      const id = uuidv7();
      await tx.insert(tags).values({ id, slug, name });
      tagIds.push(id);
    }
  }

  await tx
    .insert(plazaTemplateTags)
    .values(tagIds.map((tagId) => ({ templateId, tagId })));
}

export async function GET() {
  try {
    const context = await requireUser();
    return jsonOk({ submissions: await listMySubmissions(context.user.id) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, plazaSubmitSchema);
    const db = getDb();

    if (input.categoryId) {
      const [category] = await db
        .select({ id: plazaCategories.id })
        .from(plazaCategories)
        .where(eq(plazaCategories.id, input.categoryId))
        .limit(1);
      if (!category) {
        throw new ApiError(400, "INVALID_CATEGORY", "所选分类不存在");
      }
    }

    const { snapshot } = await buildTemplateSnapshot(
      context.user.id,
      input.templateId,
    );
    const coverUrl =
      safeCoverUrl(input.coverUrl) ?? snapshot.character.avatarUrl ?? null;
    const summary = input.summary?.trim() || snapshot.character.tagline || null;

    let plazaTemplateId = input.plazaTemplateId ?? null;
    let resolvedTags = input.tags ?? [];

    await db.transaction(async (tx) => {
      if (plazaTemplateId) {
        const [existing] = await tx
          .select({
            id: plazaTemplates.id,
            categoryId: plazaTemplates.categoryId,
            coverUrl: plazaTemplates.coverUrl,
            summary: plazaTemplates.summary,
          })
          .from(plazaTemplates)
          .where(
            and(
              eq(plazaTemplates.id, plazaTemplateId),
              eq(plazaTemplates.authorId, context.user.id),
              isNull(plazaTemplates.deletedAt),
            ),
          )
          .limit(1);

        if (!existing) {
          throw new ApiError(
            404,
            "SUBMISSION_NOT_FOUND",
            "投稿不存在或无权修改",
          );
        }

        const [latest] = await tx
          .select({ version: plazaTemplateVersions.version })
          .from(plazaTemplateVersions)
          .where(eq(plazaTemplateVersions.templateId, plazaTemplateId))
          .orderBy(desc(plazaTemplateVersions.version))
          .limit(1);

        await tx.insert(plazaTemplateVersions).values({
          id: uuidv7(),
          templateId: plazaTemplateId,
          version: (latest?.version ?? 0) + 1,
          snapshot,
          changelog: input.changelog?.trim() || null,
          createdBy: context.user.id,
        });

        if (input.tags === undefined) {
          const existingTags = await tx
            .select({ name: tags.name })
            .from(plazaTemplateTags)
            .innerJoin(tags, eq(tags.id, plazaTemplateTags.tagId))
            .where(eq(plazaTemplateTags.templateId, plazaTemplateId));
          resolvedTags = existingTags.map((tag) => tag.name);
        }

        await tx
          .update(plazaTemplates)
          .set({
            title: input.title,
            summary:
              input.summary === undefined ? existing.summary : summary,
            categoryId:
              input.categoryId === undefined
                ? existing.categoryId
                : input.categoryId,
            coverUrl:
              input.coverUrl === undefined ? existing.coverUrl : coverUrl,
            status: "pending",
            submittedAt: new Date(),
            rejectReason: null,
            reviewedAt: null,
            reviewedBy: null,
          })
          .where(eq(plazaTemplates.id, plazaTemplateId));
      } else {
        plazaTemplateId = uuidv7();
        await tx.insert(plazaTemplates).values({
          id: plazaTemplateId,
          authorId: context.user.id,
          categoryId: input.categoryId ?? null,
          title: input.title,
          summary,
          coverUrl,
          status: "pending",
          submittedAt: new Date(),
        });

        await tx.insert(plazaTemplateVersions).values({
          id: uuidv7(),
          templateId: plazaTemplateId,
          version: 1,
          snapshot,
          changelog: input.changelog?.trim() || null,
          createdBy: context.user.id,
        });
      }

      await attachTags(tx, plazaTemplateId!, resolvedTags);
    });

    const submissions = await listMySubmissions(context.user.id);
    const submission = submissions.find((item) => item.id === plazaTemplateId);

    return jsonOk({ submission }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
