import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { plazaTemplates, plazaTemplateVersions } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAdmin } from "@/lib/auth/guard";
import { plazaModerationSchema } from "@/lib/validation/plaza";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const { id } = await params;
    const input = await readJson(request, plazaModerationSchema);
    const db = getDb();

    const [template] = await db
      .select()
      .from(plazaTemplates)
      .where(and(eq(plazaTemplates.id, id), isNull(plazaTemplates.deletedAt)))
      .limit(1);

    if (!template) {
      throw new ApiError(404, "SUBMISSION_NOT_FOUND", "投稿不存在");
    }

    if (input.action === "approve") {
      const [latest] = await db
        .select({ id: plazaTemplateVersions.id })
        .from(plazaTemplateVersions)
        .where(eq(plazaTemplateVersions.templateId, id))
        .orderBy(desc(plazaTemplateVersions.version))
        .limit(1);

      if (!latest) {
        throw new ApiError(400, "NO_VERSION", "该投稿还没有可发布的内容版本");
      }

      await db
        .update(plazaTemplates)
        .set({
          status: "published",
          publishedVersionId: latest.id,
          reviewedAt: new Date(),
          reviewedBy: context.user.id,
          rejectReason: null,
        })
        .where(eq(plazaTemplates.id, id));

      await recordAudit({
        actorId: context.user.id,
        action: "plaza.approve",
        targetType: "plaza_template",
        targetId: id,
        detail: { versionId: latest.id },
        request,
      });

      return jsonOk({ id, status: "published" });
    }

    if (input.action === "reject") {
      if (!input.reason) {
        throw new ApiError(400, "REASON_REQUIRED", "请填写拒绝原因");
      }

      await db
        .update(plazaTemplates)
        .set({
          status: template.publishedVersionId ? "published" : "rejected",
          rejectReason: input.reason,
          reviewedAt: new Date(),
          reviewedBy: context.user.id,
        })
        .where(eq(plazaTemplates.id, id));

      await recordAudit({
        actorId: context.user.id,
        action: "plaza.reject",
        targetType: "plaza_template",
        targetId: id,
        detail: { reason: input.reason },
        request,
      });

      return jsonOk({
        id,
        status: template.publishedVersionId ? "published" : "rejected",
      });
    }

    if (input.action === "archive") {
      await db
        .update(plazaTemplates)
        .set({ status: "archived" })
        .where(eq(plazaTemplates.id, id));

      await recordAudit({
        actorId: context.user.id,
        action: "plaza.archive",
        targetType: "plaza_template",
        targetId: id,
        request,
      });

      return jsonOk({ id, status: "archived" });
    }

    if (!template.publishedVersionId) {
      throw new ApiError(400, "NOT_PUBLISHED", "只有已发布的模板可以设置推荐");
    }

    const featured = input.action === "feature";
    await db
      .update(plazaTemplates)
      .set({ featured })
      .where(eq(plazaTemplates.id, id));

    await recordAudit({
      actorId: context.user.id,
      action: featured ? "plaza.feature" : "plaza.unfeature",
      targetType: "plaza_template",
      targetId: id,
      request,
    });

    return jsonOk({ id, featured });
  } catch (error) {
    return handleApiError(error);
  }
}
