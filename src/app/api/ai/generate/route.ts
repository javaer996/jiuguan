import { z } from "zod";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { AI_KINDS } from "@/lib/ai/drafts";
import { generateAiDraft } from "@/lib/ai/generate";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/rate-limit";

const generateSchema = z.object({
  kind: z.enum(AI_KINDS),
  idea: z.string().trim().min(2, "请多写一点灵感").max(2000),
  providerId: z.uuid().nullish(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, generateSchema);

    const limit = rateLimit(`ai:generate:${context.user.id}`, 15, 10 * 60 * 1000);
    if (!limit.ok) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `生成太频繁了，请 ${limit.retryAfterSeconds} 秒后再试`,
      );
    }

    const result = await generateAiDraft({
      userId: context.user.id,
      kind: input.kind,
      idea: input.idea,
      providerId: input.providerId,
      signal: request.signal,
    });

    return jsonOk({ kind: input.kind, ...result });
  } catch (error) {
    return handleApiError(error);
  }
}
