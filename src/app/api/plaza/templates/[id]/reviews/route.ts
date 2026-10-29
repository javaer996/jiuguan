import { and, eq, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { plazaReviews, plazaTemplates } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { getPublishedVersion } from "@/lib/plaza/query";
import { plazaReviewSchema } from "@/lib/validation/plaza";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    const input = await readJson(request, plazaReviewSchema);

    const published = await getPublishedVersion(id);
    if (!published) {
      throw new ApiError(
        404,
        "PLAZA_TEMPLATE_NOT_FOUND",
        "广场模板不存在或尚未发布",
      );
    }

    const db = getDb();
    const content = input.content?.trim() ? input.content.trim() : null;

    await db.transaction(async (tx) => {
      const [existing] = await tx
        .select({ id: plazaReviews.id })
        .from(plazaReviews)
        .where(
          and(
            eq(plazaReviews.templateId, id),
            eq(plazaReviews.userId, context.user.id),
          ),
        )
        .limit(1);

      if (existing) {
        await tx
          .update(plazaReviews)
          .set({ rating: input.rating, content, status: "visible" })
          .where(eq(plazaReviews.id, existing.id));
      } else {
        await tx.insert(plazaReviews).values({
          id: uuidv7(),
          templateId: id,
          userId: context.user.id,
          rating: input.rating,
          content,
        });
      }

      const [agg] = await tx
        .select({
          average: sql<
            string | number
          >`coalesce(avg(${plazaReviews.rating}), 0)`,
          total: sql<number>`count(*)`.mapWith(Number),
        })
        .from(plazaReviews)
        .where(
          and(
            eq(plazaReviews.templateId, id),
            eq(plazaReviews.status, "visible"),
          ),
        );

      const ratingAvg = Math.round(Number(agg?.average ?? 0) * 100) / 100;

      await tx
        .update(plazaTemplates)
        .set({ ratingAvg, ratingCount: agg?.total ?? 0 })
        .where(eq(plazaTemplates.id, id));
    });

    const [row] = await db
      .select({
        ratingAvg: plazaTemplates.ratingAvg,
        ratingCount: plazaTemplates.ratingCount,
      })
      .from(plazaTemplates)
      .where(eq(plazaTemplates.id, id))
      .limit(1);

    return jsonOk({
      ratingAvg: row?.ratingAvg ?? 0,
      ratingCount: row?.ratingCount ?? 0,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
