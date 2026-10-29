import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { plazaTemplates } from "@/db/schema";
import { ApiError, handleApiError, jsonOk } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { cloneSnapshotToUser } from "@/lib/plaza/clone";
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

    const chatTemplateId = await cloneSnapshotToUser(
      context.user.id,
      published.version.snapshot,
      {
        title: published.template.title,
        description: published.template.summary,
        coverUrl: published.template.coverUrl,
      },
    );

    const db = getDb();
    await db
      .update(plazaTemplates)
      .set({ cloneCount: sql`${plazaTemplates.cloneCount} + 1` })
      .where(eq(plazaTemplates.id, id));

    await Promise.all([
      recordTemplateEvent(
        id,
        context.user.id,
        "clone",
        eventMetaFromRequest(request),
      ),
      bumpDailyStat(id, "clones"),
    ]);

    return jsonOk({ chatTemplateId }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
