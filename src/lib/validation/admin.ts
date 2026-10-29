import { z } from "zod";

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

export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
export type AdminInviteCreateInput = z.infer<typeof adminInviteCreateSchema>;
export type AdminInviteUpdateInput = z.infer<typeof adminInviteUpdateSchema>;
export type AdminGrantInput = z.infer<typeof adminGrantSchema>;
export type AdminSettingsInput = z.infer<typeof adminSettingsSchema>;
export type AdminGenerationPromptsInput = z.infer<
  typeof adminGenerationPromptsSchema
>;
