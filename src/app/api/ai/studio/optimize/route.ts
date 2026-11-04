import {
  ApiError,
  assertPayloadSize,
  handleApiError,
  jsonOk,
  readJson,
} from "@/lib/api";
import { optimizeStudioIdea } from "@/lib/ai/studio";
import { optimizeStudioInputSchema } from "@/lib/ai/studio-schema";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    assertPayloadSize(request);
    const input = await readJson(request, optimizeStudioInputSchema);

    const limit = rateLimit(
      `ai:studio:optimize:${context.user.id}`,
      15,
      10 * 60 * 1000,
    );
    if (!limit.ok) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `优化太频繁了，请 ${limit.retryAfterSeconds} 秒后再试`,
      );
    }

    const result = await optimizeStudioIdea({
      userId: context.user.id,
      idea: input.idea,
      providerId: input.providerId,
      overrides: input.overrides,
      currentBrief: input.currentBrief,
      signal: request.signal,
    });

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
