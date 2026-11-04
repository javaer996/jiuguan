import { z } from "zod";
import { AI_KINDS } from "@/lib/ai/kinds";
import { worldbookPositionSchema } from "@/lib/validation/content";
import type { StudioPromptOverrides, StudioPromptPair } from "@/lib/types/studio";

/**
 * 创作纲要。每个字段都同时提供 default + catch：
 * 模型漏字段或类型不对时退回空值，避免整份纲要解析失败。
 */
export const creativeBriefSchema = z.object({
  templateName: z.string().trim().max(80).default("").catch(""),
  templateDescription: z.string().trim().max(400).default("").catch(""),
  premise: z.string().trim().max(2000).default("").catch(""),
  setting: z.string().trim().max(2000).default("").catch(""),
  tone: z.string().trim().max(1000).default("").catch(""),
  themes: z
    .array(z.string().trim().min(1).max(32))
    .max(12)
    .default([])
    .catch([]),
  userName: z.string().trim().max(48).default("").catch(""),
  userRole: z.string().trim().max(1000).default("").catch(""),
  mainCharacter: z.string().trim().max(2000).default("").catch(""),
  supportingCharacters: z
    .array(z.string().trim().min(1).max(500))
    .max(8)
    .default([])
    .catch([]),
  worldbookTopics: z
    .array(z.string().trim().min(1).max(500))
    .max(20)
    .default([])
    .catch([]),
  promptDirection: z.string().trim().max(1000).default("").catch(""),
  styleDirection: z.string().trim().max(1000).default("").catch(""),
  themeDirection: z.string().trim().max(1000).default("").catch(""),
  contentWarnings: z
    .array(z.string().trim().min(1).max(200))
    .max(10)
    .default([])
    .catch([]),
});

export type CreativeBrief = z.infer<typeof creativeBriefSchema>;

export const studioPromptPairSchema = z.object({
  system: z.string().max(50_000).optional(),
  user: z.string().max(50_000).optional(),
});

/** 显式列出每个 key，避免 z.record 对枚举键做穷举要求。 */
export const studioPromptOverridesSchema = z.object({
  optimize: studioPromptPairSchema.optional(),
  character: studioPromptPairSchema.optional(),
  worldbook: studioPromptPairSchema.optional(),
  worldbookExpansion: studioPromptPairSchema.optional(),
  prompt: studioPromptPairSchema.optional(),
  style: studioPromptPairSchema.optional(),
  theme: studioPromptPairSchema.optional(),
}) satisfies z.ZodType<StudioPromptOverrides>;

const worldbookOutlineEntrySchema = z.object({
  name: z.string().trim().min(1).max(128),
  keys: z.array(z.string().trim().min(1).max(64)).max(20).default([]),
  secondaryKeys: z.array(z.string().trim().min(1).max(64)).max(20).default([]),
  /** 大纲阶段可以返回 summary 或 content，扩写时二选一作为摘要。 */
  summary: z.string().trim().max(2000).optional(),
  content: z.string().trim().max(2000).optional(),
  constant: z.boolean().optional(),
  selective: z.boolean().optional(),
  position: worldbookPositionSchema.optional(),
});

export const worldbookOutlineSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(2000).optional(),
  scanDepth: z.number().int().min(0).max(50).optional(),
  tokenBudget: z.number().int().min(0).max(100_000).optional(),
  recursive: z.boolean().optional(),
  entries: z.array(worldbookOutlineEntrySchema).min(1).max(20),
});

export type WorldbookOutline = z.infer<typeof worldbookOutlineSchema>;

export const worldbookExpansionSchema = z.object({
  entries: z
    .array(
      z.object({
        index: z.number().int().min(0).max(50).optional(),
        name: z.string().trim().max(128).optional(),
        content: z.string().trim().max(20_000),
      }),
    )
    .min(1)
    .max(20),
});

export type WorldbookExpansion = z.infer<typeof worldbookExpansionSchema>;

const ideaSchema = z
  .string()
  .trim()
  .min(2, "灵感太短了")
  .max(12_000, "灵感太长了，请精简到 12000 字以内");

const existingSchema = z.record(z.string(), z.unknown()).nullish();

const kindsSchema = z
  .array(z.enum(AI_KINDS))
  .min(1, "至少选择一种生成内容")
  .max(AI_KINDS.length)
  .transform((kinds) => [...new Set(kinds)]);

export const optimizeStudioInputSchema = z.object({
  idea: ideaSchema,
  providerId: z.uuid().nullish(),
  overrides: studioPromptOverridesSchema.optional(),
  currentBrief: creativeBriefSchema.nullish(),
});

export const studioPromptsInputSchema = z.object({
  idea: ideaSchema,
  brief: creativeBriefSchema.nullish(),
  kinds: kindsSchema,
  worldbookEntryCount: z.number().int().min(4).max(16).optional(),
  existing: existingSchema,
  overrides: studioPromptOverridesSchema.optional(),
  mode: z.enum(["batch", "regenerate"]).optional(),
});

export const studioGenerateInputSchema = studioPromptsInputSchema
  .extend({
    providerId: z.uuid().nullish(),
  })
  .refine(
    (value) => value.mode !== "regenerate" || value.kinds.length === 1,
    {
      message: "单项重生成只能选择一个类型",
      path: ["kinds"],
    },
  );

export const studioSaveInputSchema = z
  .object({
    drafts: z
      .record(z.string(), z.unknown())
      .refine((value) => Object.keys(value).length > 0, "没有可保存的内容"),
    templateName: z.string().trim().min(1, "模板名称不能为空").max(80),
    templateDescription: z.string().trim().max(400).nullish(),
    providerId: z.uuid().nullish(),
    /** 使用已有用户身份。 */
    personaId: z.uuid().nullish(),
    /** 根据纲要新建用户身份；与 personaId 二选一。 */
    persona: z
      .object({
        name: z.string().trim().min(1, "身份名称不能为空").max(48),
        description: z.string().trim().max(20_000).nullish(),
      })
      .nullish(),
  })
  .refine((value) => !(value.personaId && value.persona), {
    message: "不能同时指定已有身份和新建身份",
    path: ["persona"],
  });

/** 生成提示词覆盖的运行时类型，供路由与前端共用。 */
export type StudioPromptOverridesInput = StudioPromptOverrides;
export type StudioPromptPairInput = StudioPromptPair;
