import { and, eq, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { plazaTemplates, templateLikes } from "@/db/schema";
import { ApiError, handleApiError, jsonOk } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import {
  bumpDailyStat,
  eventMetaFromRequest,
  recordTemplateEvent,
} from "@/lib/plaza/events";
import { getPublishedVersion } from "@/lib/plaza/query";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;

    const published = await getPublishedVersion(id);
    if (!published) {
      throw new ApiError(
        404,
        "PLAZA_TEMPLATE_NOT_FOUND",
        "广场模板不存在或尚未发布",
      );
    }

    const db = getDb();
    const [existing] = await db
      .select({ id: templateLikes.id })
      .from(templateLikes)
      .where(
        and(
          eq(templateLikes.templateId, id),
          eq(templateLikes.userId, context.user.id),
        ),
      )
      .limit(1);

    let liked: boolean;
    if (existing) {
      await db.transaction(async (tx) => {
        await tx.delete(templateLikes).where(eq(templateLikes.id, existing.id));
        await tx
          .update(plazaTemplates)
          .set({
            likeCount: sql`GREATEST(${plazaTemplates.likeCount} - 1, 0)`,
          })
          .where(eq(plazaTemplates.id, id));
      });
      liked = false;
      await recordTemplateEvent(
        id,
        context.user.id,
        "unlike",
        eventMetaFromRequest(request),
      );
    } else {
      await db.transaction(async (tx) => {
        await tx.insert(templateLikes).values({
          id: uuidv7(),
          templateId: id,
          userId: context.user.id,
        });
        await tx
          .update(plazaTemplates)
          .set({ likeCount: sql`${plazaTemplates.likeCount} + 1` })
          .where(eq(plazaTemplates.id, id));
      });
      liked = true;
      await Promise.all([
        recordTemplateEvent(
          id,
          context.user.id,
          "like",
          eventMetaFromRequest(request),
        ),
        bumpDailyStat(id, "likes"),
      ]);
    }

    const [row] = await db
      .select({ likeCount: plazaTemplates.likeCount })
      .from(plazaTemplates)
      .where(eq(plazaTemplates.id, id))
      .limit(1);

    return jsonOk({ liked, likeCount: row?.likeCount ?? 0 });
  } catch (error) {
    return handleApiError(error);
  }
}
