import {
  AI_KINDS,
  DEFAULT_GENERATION_PROMPTS,
  type AiKind,
  type GenerationKindPrompt,
  type GenerationPromptSettings,
} from "@/lib/ai/drafts";
import { getSettings, setSetting } from "@/lib/settings";

export const GENERATION_PROMPTS_SETTING_KEY = "ai.generation_prompts";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(
  value: unknown,
  fallback: string,
  maxLength: number,
  allowEmpty = false,
) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return allowEmpty ? "" : fallback;
  return trimmed.slice(0, maxLength);
}

function userTemplate(value: unknown, fallback: string) {
  const template = text(value, fallback, 20_000);
  return template.includes("{{idea}}")
    ? template
    : `${template}\n\n{{idea}}`;
}

/** 合并数据库里的配置与内置默认，避免旧数据或异常数据让生成不可用。 */
export function sanitizeGenerationPromptSettings(
  value: unknown,
): GenerationPromptSettings {
  const record = asRecord(value);
  const storedKinds = asRecord(record?.kinds);
  const kinds = {} as Record<AiKind, GenerationKindPrompt>;

  for (const kind of AI_KINDS) {
    const fallback = DEFAULT_GENERATION_PROMPTS.kinds[kind];
    const stored = asRecord(storedKinds?.[kind]);
    kinds[kind] = {
      system: text(stored?.system, fallback.system, 50_000, true),
      user: userTemplate(stored?.user, fallback.user),
    };
  }

  return {
    sharedRules: text(
      record?.sharedRules,
      DEFAULT_GENERATION_PROMPTS.sharedRules,
      20_000,
      true,
    ),
    kinds,
  };
}

export async function getGenerationPromptSettings() {
  const values = await getSettings({
    [GENERATION_PROMPTS_SETTING_KEY]: DEFAULT_GENERATION_PROMPTS,
  });
  return sanitizeGenerationPromptSettings(
    values[GENERATION_PROMPTS_SETTING_KEY],
  );
}

export async function saveGenerationPromptSettings(
  settings: GenerationPromptSettings,
  updatedBy: string,
) {
  const sanitized = sanitizeGenerationPromptSettings(settings);
  await setSetting(GENERATION_PROMPTS_SETTING_KEY, sanitized, updatedBy);
  return sanitized;
}
