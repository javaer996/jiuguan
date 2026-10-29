import { and, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { favorites } from "@/db/schema";
import { ApiError, handleApiError, jsonOk } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { eventMetaFromRequest, recordTemplateEvent } from "@/lib/plaza/events";
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
      .select({ id: favorites.id })
      .from(favorites)
      .where(
        and(
          eq(favorites.userId, context.user.id),
          eq(favorites.targetType, "template"),
          eq(favorites.targetId, id),
        ),
      )
      .limit(1);

    if (existing) {
      await db.delete(favorites).where(eq(favorites.id, existing.id));
      return jsonOk({ favorited: false });
    }

    await db.insert(favorites).values({
      id: uuidv7(),
      userId: context.user.id,
      targetType: "template",
      targetId: id,
    });
    await recordTemplateEvent(
      id,
      context.user.id,
      "favorite",
      eventMetaFromRequest(request),
    );

    return jsonOk({ favorited: true });
  } catch (error) {
    return handleApiError(error);
  }
}
