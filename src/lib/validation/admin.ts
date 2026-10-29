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

export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
export type AdminInviteCreateInput = z.infer<typeof adminInviteCreateSchema>;
export type AdminInviteUpdateInput = z.infer<typeof adminInviteUpdateSchema>;
export type AdminGrantInput = z.infer<typeof adminGrantSchema>;
export type AdminSettingsInput = z.infer<typeof adminSettingsSchema>;
