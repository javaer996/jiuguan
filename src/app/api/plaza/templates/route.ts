import { handleApiError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";
import { parseLimit, parseOffset } from "@/lib/content/query";
import { listPlazaTemplates, type PlazaListSort } from "@/lib/plaza/query";

const SORTS = new Set<PlazaListSort>(["hot", "new", "rating"]);

export async function GET(request: Request) {
  try {
    const context = await requireUser();
    const url = new URL(request.url);
    const sortParam = url.searchParams.get("sort") as PlazaListSort | null;
    const sort = sortParam && SORTS.has(sortParam) ? sortParam : "hot";
    const limit = parseLimit(url.searchParams.get("limit"), 24, 60);
    const offset = parseOffset(url.searchParams.get("offset"));

    const result = await listPlazaTemplates({
      viewerId: context.user.id,
      category: url.searchParams.get("category"),
      tag: url.searchParams.get("tag"),
      q: url.searchParams.get("q"),
      sort,
      limit,
      offset,
    });

    return jsonOk({ ...result, limit, offset });
  } catch (error) {
    return handleApiError(error);
  }
}
