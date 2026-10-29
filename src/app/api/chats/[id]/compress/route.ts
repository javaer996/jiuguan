import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { contextCompressions } from "@/db/schema";
import { ApiError, handleApiError, jsonOk } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import {
  findOwnedSession,
  loadChatContext,
} from "@/lib/chat/context";
import {
  compressSession,
  toCompressionDTO,
} from "@/lib/chat/memory";
import { rateLimit } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    const session = await findOwnedSession(id, context.user.id);

    const limit = rateLimit(
      `chat:compress:${context.user.id}`,
      10,
      10 * 60 * 1000,
    );
    if (!limit.ok) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `压缩太频繁了，请 ${limit.retryAfterSeconds} 秒后再试`,
      );
    }

    const chatContext = await loadChatContext(session);
    const row = await compressSession({
      context: chatContext,
      force: true,
      signal: request.signal,
    });

    if (!row) {
      throw new ApiError(
        400,
        "NOT_ENOUGH_CONTEXT",
        "早期消息还不够多，暂时不需要压缩",
      );
    }

    return jsonOk({ compression: toCompressionDTO(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    const session = await findOwnedSession(id, context.user.id);

    await getDb()
      .delete(contextCompressions)
      .where(eq(contextCompressions.sessionId, session.id));

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
