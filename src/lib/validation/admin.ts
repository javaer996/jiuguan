import { z } from "zod";
import { PLAZA_CATEGORY_ICON_NAMES } from "@/lib/content/plaza";

export const adminUserUpdateSchema = z
  .object({
    status: z.enum(["active", "suspended"]).optional(),
    role: z.enum(["user", "admin"]).optional(),
  })
  .refine((value) => value.status !== undefined || value.role !== undefined, {
    message: "至少需要修改一项",
  });

export const adminInviteCreateSchema = z.object({
  count: z.number().int().min(1).max(20).default(1),
  maxUses: z.number().int().min(1).max(10_000).default(1),
  expiresAt: z.iso.datetime({ offset: true }).nullish(),
  note: z.string().trim().max(255).optional(),
});

export const adminInviteUpdateSchema = z
  .object({
    disabled: z.boolean().optional(),
    maxUses: z.number().int().min(1).max(10_000).optional(),
    expiresAt: z.iso.datetime({ offset: true }).nullish(),
    note: z.string().trim().max(255).nullish(),
  })
  .refine(
    (value) =>
      value.disabled !== undefined ||
      value.maxUses !== undefined ||
      value.expiresAt !== undefined ||
      value.note !== undefined,
    { message: "至少需要修改一项" },
  );

export const adminGrantSchema = z.object({
  userId: z.uuid(),
  action: z.enum(["grant", "revoke"]),
});

export const adminSettingsSchema = z.object({
  registrationEnabled: z.boolean(),
  inviteRequired: z.boolean(),
  siteNotice: z.string().trim().max(2000).default(""),
});

const generationKindPromptSchema = z.object({
  system: z.string().trim().max(50_000).default(""),
  user: z
    .string()
    .trim()
    .min(5, "用户消息模板太短")
    .max(20_000)
    .refine(
      (value) => value.includes("{{idea}}"),
      "用户消息模板必须包含 {{idea}} 占位符",
    ),
});

export const adminGenerationPromptsSchema = z.object({
  sharedRules: z.string().trim().max(20_000).default(""),
  kinds: z.object({
    character: generationKindPromptSchema,
    worldbook: generationKindPromptSchema,
    prompt: generationKindPromptSchema,
    style: generationKindPromptSchema,
    theme: generationKindPromptSchema,
  }),
});

const plazaCategoryNameSchema = z
  .string()
  .trim()
  .min(1, "请填写分类名称")
  .max(64, "分类名称最多 64 个字符");

const plazaCategorySlugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(2, "标识至少 2 个字符")
  .max(64, "标识最多 64 个字符")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "标识只能包含小写字母、数字和连字符，且不能以连字符开头或结尾",
  );

const plazaCategoryIconSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.enum(PLAZA_CATEGORY_ICON_NAMES).nullish(),
);

export const adminPlazaCategoryCreateSchema = z.object({
  name: plazaCategoryNameSchema,
  slug: z.preprocess(
    (value) => (value === "" ? undefined : value),
    plazaCategorySlugSchema.optional(),
  ),
  description: z
    .string()
    .trim()
    .max(255, "描述最多 255 个字符")
    .nullish(),
  icon: plazaCategoryIconSchema,
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

export const adminPlazaCategoryUpdateSchema = z
  .object({
    name: plazaCategoryNameSchema.optional(),
    description: z
      .string()
      .trim()
      .max(255, "描述最多 255 个字符")
      .nullish(),
    icon: plazaCategoryIconSchema,
    sortOrder: z.number().int().min(0).max(9999).optional(),
  })
  .refine(
    (value) =>
      value.name !== undefined ||
      value.description !== undefined ||
      value.icon !== undefined ||
      value.sortOrder !== undefined,
    { message: "至少需要修改一项" },
  );

export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
export type AdminInviteCreateInput = z.infer<typeof adminInviteCreateSchema>;
export type AdminInviteUpdateInput = z.infer<typeof adminInviteUpdateSchema>;
export type AdminGrantInput = z.infer<typeof adminGrantSchema>;
export type AdminSettingsInput = z.infer<typeof adminSettingsSchema>;
export type AdminGenerationPromptsInput = z.infer<
  typeof adminGenerationPromptsSchema
>;
export type AdminPlazaCategoryCreateInput = z.infer<
  typeof adminPlazaCategoryCreateSchema
>;
export type AdminPlazaCategoryUpdateInput = z.infer<
  typeof adminPlazaCategoryUpdateSchema
>;
