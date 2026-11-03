import { z } from "zod";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { generateCustomCss } from "@/lib/ai/css";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/rate-limit";

const cssRequestSchema = z.object({
  target: z.enum(["style", "theme"]).default("style"),
  idea: z.string().trim().min(2, "请多写一点描述").max(800),
  currentCss: z.string().max(50_000).default(""),
  context: z.string().trim().max(2000).optional(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, cssRequestSchema);

    const limit = rateLimit(`ai:css:${context.user.id}`, 10, 10 * 60 * 1000);
    if (!limit.ok) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `生成太频繁了，请 ${limit.retryAfterSeconds} 秒后再试`,
      );
    }

    const result = await generateCustomCss({
      userId: context.user.id,
      target: input.target,
      idea: input.idea,
      currentCss: input.currentCss,
      context: input.context,
      signal: request.signal,
    });

    return jsonOk(result);
  } catch (error) {
    return handleApiError(error);
  }
}
