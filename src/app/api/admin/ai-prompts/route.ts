import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { DEFAULT_GENERATION_PROMPTS } from "@/lib/ai/drafts";
import {
  GENERATION_PROMPTS_SETTING_KEY,
  getGenerationPromptSettings,
  saveGenerationPromptSettings,
} from "@/lib/ai/prompt-settings";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAdmin } from "@/lib/auth/guard";
import { adminGenerationPromptsSchema } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return jsonOk({
      prompts: await getGenerationPromptSettings(),
      defaults: DEFAULT_GENERATION_PROMPTS,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const input = await readJson(request, adminGenerationPromptsSchema);
    const prompts = await saveGenerationPromptSettings(
      input,
      context.user.id,
    );

    await recordAudit({
      actorId: context.user.id,
      action: "ai_prompts.update",
      targetType: "system_setting",
      targetId: GENERATION_PROMPTS_SETTING_KEY,
      detail: {
        kinds: Object.keys(input.kinds),
        sharedRulesLength: input.sharedRules.length,
      },
      request,
    });

    return jsonOk({ prompts, defaults: DEFAULT_GENERATION_PROMPTS });
  } catch (error) {
    return handleApiError(error);
  }
}
