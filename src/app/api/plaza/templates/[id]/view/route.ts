import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { plazaTemplates, templateEvents } from "@/db/schema";
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
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [recent] = await db
      .select({ id: templateEvents.id })
      .from(templateEvents)
      .where(
        and(
          eq(templateEvents.templateId, id),
          eq(templateEvents.userId, context.user.id),
          eq(templateEvents.type, "view"),
          gte(templateEvents.createdAt, startOfDay),
        ),
      )
      .limit(1);

    if (recent) {
      return jsonOk({ counted: false });
    }

    await db
      .update(plazaTemplates)
      .set({ viewCount: sql`${plazaTemplates.viewCount} + 1` })
      .where(eq(plazaTemplates.id, id));

    await Promise.all([
      recordTemplateEvent(
        id,
        context.user.id,
        "view",
        eventMetaFromRequest(request),
      ),
      bumpDailyStat(id, "views"),
    ]);

    return jsonOk({ counted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
