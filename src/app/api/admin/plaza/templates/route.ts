import { handleApiError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";
import { listAdminSubmissions } from "@/lib/plaza/query";
import type { PlazaStatus } from "@/lib/types/plaza";

const STATUSES = new Set<PlazaStatus | "all">([
  "draft",
  "pending",
  "published",
  "rejected",
  "archived",
  "all",
]);

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status") as
      PlazaStatus | "all" | null;
    const status =
      statusParam && STATUSES.has(statusParam) ? statusParam : "pending";

    return jsonOk({ submissions: await listAdminSubmissions(status) });
  } catch (error) {
    return handleApiError(error);
  }
}
