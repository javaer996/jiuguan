import { inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { systemSettings } from "@/db/schema";

export const SETTING_KEYS = {
  registrationEnabled: "registration.enabled",
  inviteRequired: "registration.invite_required",
  siteNotice: "site.notice",
} as const;

/** 批量读取系统设置，缺失的键使用默认值。 */
export async function getSettings<T extends Record<string, unknown>>(
  defaults: T,
): Promise<T> {
  const keys = Object.keys(defaults);
  if (keys.length === 0) return defaults;

  const rows = await getDb()
    .select({ key: systemSettings.key, value: systemSettings.value })
    .from(systemSettings)
    .where(inArray(systemSettings.key, keys));

  const stored = new Map(rows.map((row) => [row.key, row.value]));
  const result = {} as T;
  for (const key of keys) {
    result[key as keyof T] = (stored.has(key)
      ? stored.get(key)
      : defaults[key]) as T[keyof T];
  }
  return result;
}

export type RegistrationPolicy = {
  enabled: boolean;
  inviteRequired: boolean;
};

export async function getRegistrationPolicy(): Promise<RegistrationPolicy> {
  const values = await getSettings({
    [SETTING_KEYS.registrationEnabled]: true,
    [SETTING_KEYS.inviteRequired]: true,
  });

  return {
    enabled: Boolean(values[SETTING_KEYS.registrationEnabled]),
    inviteRequired: Boolean(values[SETTING_KEYS.inviteRequired]),
  };
}

export async function getSiteNotice(): Promise<string> {
  const values = await getSettings({ [SETTING_KEYS.siteNotice]: "" });
  const notice = values[SETTING_KEYS.siteNotice];
  return typeof notice === "string" ? notice.trim() : "";
}

export async function setSetting(
  key: string,
  value: unknown,
  updatedBy?: string,
): Promise<void> {
  await getDb()
    .insert(systemSettings)
    .values({ key, value, updatedBy })
    .onDuplicateKeyUpdate({
      set: { value, updatedBy, updatedAt: new Date() },
    });
}
