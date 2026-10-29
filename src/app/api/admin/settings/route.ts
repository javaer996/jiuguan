import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAdmin } from "@/lib/auth/guard";
import {
  getSettings,
  SETTING_KEYS,
  setSetting,
} from "@/lib/settings";
import { adminSettingsSchema } from "@/lib/validation/admin";
import type { AdminSettingsDTO } from "@/lib/types/admin";

async function readSettings(): Promise<AdminSettingsDTO> {
  const values = await getSettings({
    [SETTING_KEYS.registrationEnabled]: true,
    [SETTING_KEYS.inviteRequired]: true,
    [SETTING_KEYS.siteNotice]: "",
  });

  return {
    registrationEnabled: Boolean(values[SETTING_KEYS.registrationEnabled]),
    inviteRequired: Boolean(values[SETTING_KEYS.inviteRequired]),
    siteNotice:
      typeof values[SETTING_KEYS.siteNotice] === "string"
        ? values[SETTING_KEYS.siteNotice]
        : "",
  };
}

export async function GET() {
  try {
    await requireAdmin();
    return jsonOk({ settings: await readSettings() });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const input = await readJson(request, adminSettingsSchema);

    await Promise.all([
      setSetting(
        SETTING_KEYS.registrationEnabled,
        input.registrationEnabled,
        context.user.id,
      ),
      setSetting(
        SETTING_KEYS.inviteRequired,
        input.inviteRequired,
        context.user.id,
      ),
      setSetting(SETTING_KEYS.siteNotice, input.siteNotice, context.user.id),
    ]);

    await recordAudit({
      actorId: context.user.id,
      action: "settings.update",
      targetType: "settings",
      detail: {
        registrationEnabled: input.registrationEnabled,
        inviteRequired: input.inviteRequired,
      },
      request,
    });

    return jsonOk({ settings: await readSettings() });
  } catch (error) {
    return handleApiError(error);
  }
}
