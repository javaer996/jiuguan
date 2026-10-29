import { handleApiError, jsonOk } from "@/lib/api";
import { listAdminAudit } from "@/lib/admin/query";
import { requireAdmin } from "@/lib/auth/guard";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const limit = Math.min(
      300,
      Math.max(1, Number(new URL(request.url).searchParams.get("limit")) || 100),
    );
    return jsonOk({ logs: await listAdminAudit(limit) });
  } catch (error) {
    return handleApiError(error);
  }
}
