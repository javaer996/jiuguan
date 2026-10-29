import { z } from "zod";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { generateChatAids } from "@/lib/chat/aids";
import {
  findOwnedSession,
  loadChatContext,
} from "@/lib/chat/context";
import { rateLimit } from "@/lib/rate-limit";

type RouteParams = { params: Promise<{ id: string }> };

const aidsSchema = z.object({
  messageId: z.uuid().optional(),
  force: z.boolean().optional(),
  scope: z.enum(["all", "options"]).optional(),
});

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    const session = await findOwnedSession(id, context.user.id);
    const input = await readJson(request, aidsSchema);

    const limit = rateLimit(
      `chat:aids:${context.user.id}`,
      60,
      10 * 60 * 1000,
    );
    if (!limit.ok) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `互动信息生成太频繁了，请 ${limit.retryAfterSeconds} 秒后再试`,
      );
    }

    const chatContext = await loadChatContext(session);
    const aids = await generateChatAids({
      context: chatContext,
      messageId: input.messageId,
      force: input.force,
      onlyOptions: input.scope === "options",
      signal: request.signal,
    });

    return jsonOk({ aids });
  } catch (error) {
    return handleApiError(error);
  }
}
