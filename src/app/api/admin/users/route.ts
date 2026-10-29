import { handleApiError, jsonOk } from "@/lib/api";
import { listAdminUsers } from "@/lib/admin/query";
import { requireAdmin } from "@/lib/auth/guard";

const STATUSES = ["active", "suspended", "deleted"] as const;
const ROLES = ["user", "admin"] as const;

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const sp = new URL(request.url).searchParams;

    const rawStatus = sp.get("status");
    const status = STATUSES.includes(rawStatus as (typeof STATUSES)[number])
      ? (rawStatus as (typeof STATUSES)[number])
      : undefined;
    const rawRole = sp.get("role");
    const role = ROLES.includes(rawRole as (typeof ROLES)[number])
      ? (rawRole as (typeof ROLES)[number])
      : undefined;
    const q = sp.get("q")?.trim().slice(0, 80) || undefined;
    const page = Math.max(1, Number(sp.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || 30));

    const result = await listAdminUsers({
      q,
      status,
      role,
      limit,
      offset: (page - 1) * limit,
    });

    return jsonOk({ ...result, page, limit });
  } catch (error) {
    return handleApiError(error);
  }
}
