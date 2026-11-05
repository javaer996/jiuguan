import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAdmin } from "@/lib/auth/guard";
import {
  deletePlazaCategory,
  updatePlazaCategory,
} from "@/lib/plaza/categories";
import { adminPlazaCategoryUpdateSchema } from "@/lib/validation/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const { id } = await params;
    const input = await readJson(request, adminPlazaCategoryUpdateSchema);
    const category = await updatePlazaCategory(id, input);

    await recordAudit({
      actorId: context.user.id,
      action: "plaza_category.update",
      targetType: "plaza_category",
      targetId: category.id,
      detail: {
        name: category.name,
        slug: category.slug,
        icon: category.icon,
        sortOrder: category.sortOrder,
      },
      request,
    });

    return jsonOk({ category });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const { id } = await params;
    const result = await deletePlazaCategory(id);

    await recordAudit({
      actorId: context.user.id,
      action: "plaza_category.delete",
      targetType: "plaza_category",
      targetId: id,
      detail: {
        name: result.name,
        slug: result.slug,
        affectedTemplates: result.affectedTemplateCount,
      },
      request,
    });

    return jsonOk({
      deleted: true,
      affectedTemplates: result.affectedTemplateCount,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
