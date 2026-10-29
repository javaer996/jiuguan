import { ApiError, handleApiError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";
import { getPlazaTemplateDetail } from "@/lib/plaza/query";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const detail = await getPlazaTemplateDetail(id, {
      id: context.user.id,
      role: context.user.role,
    });

    if (!detail) {
      throw new ApiError(
        404,
        "PLAZA_TEMPLATE_NOT_FOUND",
        "广场模板不存在或尚未发布",
      );
    }

    return jsonOk(detail);
  } catch (error) {
    return handleApiError(error);
  }
}
