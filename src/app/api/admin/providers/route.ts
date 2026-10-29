import { handleApiError, jsonOk } from "@/lib/api";
import { listAdminSharedProviders } from "@/lib/admin/query";
import { requireAdmin } from "@/lib/auth/guard";

export async function GET() {
  try {
    await requireAdmin();
    const providers = await listAdminSharedProviders();
    return jsonOk({ providers });
  } catch (error) {
    return handleApiError(error);
  }
}
