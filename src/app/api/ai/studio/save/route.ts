import {
  ApiError,
  assertPayloadSize,
  handleApiError,
  jsonOk,
  readJson,
} from "@/lib/api";
import { saveStudioBundle } from "@/lib/ai/apply";
import { studioSaveInputSchema } from "@/lib/ai/studio-schema";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    assertPayloadSize(request);
    const input = await readJson(request, studioSaveInputSchema);

    const limit = rateLimit(
      `ai:studio:save:${context.user.id}`,
      20,
      10 * 60 * 1000,
    );
    if (!limit.ok) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `保存太频繁了，请 ${limit.retryAfterSeconds} 秒后再试`,
      );
    }

    const result = await saveStudioBundle({
      userId: context.user.id,
      templateName: input.templateName,
      templateDescription: input.templateDescription,
      providerId: input.providerId,
      personaId: input.personaId,
      persona: input.persona,
      drafts: input.drafts,
    });

    return jsonOk(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
