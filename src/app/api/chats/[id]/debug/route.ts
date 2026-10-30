import { ApiError, handleApiError, jsonOk } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/guard";
import { findOwnedSession } from "@/lib/chat/context";
import { getDebugSnapshot } from "@/lib/chat/debug";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireAdmin();
    const { id } = await params;
    const session = await findOwnedSession(id, context.user.id);

    if (session.settings?.debugMode !== true) {
      throw new ApiError(403, "DEBUG_DISABLED", "调试模式未开启");
    }

    return jsonOk({ debug: getDebugSnapshot(session.id) });
  } catch (error) {
    return handleApiError(error);
  }
}
