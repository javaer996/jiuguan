import { z } from "zod";
import { getDb } from "@/db";
import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { saveAiDraft } from "@/lib/ai/apply";
import { AI_KINDS } from "@/lib/ai/drafts";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";

const applySchema = z.object({
  kind: z.enum(AI_KINDS),
  draft: z.unknown(),
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, applySchema);

    const result = await getDb().transaction((tx) =>
      saveAiDraft(tx, context.user.id, input.kind, input.draft),
    );

    return jsonOk(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
