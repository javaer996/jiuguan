import {
  ApiError,
  assertPayloadSize,
  handleApiError,
  jsonOk,
  readJson,
} from "@/lib/api";
import { buildStudioPromptPreviews } from "@/lib/ai/studio";
import { studioPromptsInputSchema } from "@/lib/ai/studio-schema";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/rate-limit";

/** 只组装提示词，不调用 AI；用于生成前的预览与手动调整。 */
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    assertPayloadSize(request);
    const input = await readJson(request, studioPromptsInputSchema);

    const limit = rateLimit(
      `ai:studio:prompts:${context.user.id}`,
      60,
      10 * 60 * 1000,
    );
    if (!limit.ok) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `预览太频繁了，请 ${limit.retryAfterSeconds} 秒后再试`,
      );
    }

    const result = await buildStudioPromptPreviews(input);
    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
