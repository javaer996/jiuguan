import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAdmin } from "@/lib/auth/guard";
import {
  createPlazaCategory,
  listAdminPlazaCategories,
} from "@/lib/plaza/categories";
import { adminPlazaCategoryCreateSchema } from "@/lib/validation/admin";

export async function GET() {
  try {
    await requireAdmin();
    return jsonOk({ categories: await listAdminPlazaCategories() });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const input = await readJson(request, adminPlazaCategoryCreateSchema);
    const category = await createPlazaCategory(input);

    await recordAudit({
      actorId: context.user.id,
      action: "plaza_category.create",
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

    return jsonOk({ category }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
