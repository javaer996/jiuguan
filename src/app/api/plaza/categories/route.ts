import { handleApiError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";
import { listPlazaCategories } from "@/lib/plaza/query";

export async function GET() {
  try {
    await requireUser();
    return jsonOk({ categories: await listPlazaCategories() });
  } catch (error) {
    return handleApiError(error);
  }
}
