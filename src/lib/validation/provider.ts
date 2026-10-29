import { z } from "zod";

const baseUrlSchema = z
  .string()
  .trim()
  .min(1, "请填写 API 地址")
  .max(512)
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }, "API 地址必须是 http(s) URL");

export const providerCapabilitiesSchema = z.looseObject({
  stream: z.boolean().optional(),
  jsonMode: z.boolean().optional(),
  jsonSchema: z.boolean().optional(),
  vision: z.boolean().optional(),
  tools: z.boolean().optional(),
  maxContext: z.number().int().min(512).max(4_000_000).optional(),
});

export const providerInputSchema = z.object({
  name: z.string().trim().min(1, "供应商名称不能为空").max(64),
  baseUrl: baseUrlSchema,
  apiKey: z.string().trim().max(1024).optional(),
  model: z.string().trim().min(1, "请填写模型名").max(128),
  models: z.array(z.string().trim().min(1).max(128)).max(200).nullish(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(1).max(200_000).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  contextWindow: z.number().int().min(512).max(4_000_000).optional(),
  capabilities: providerCapabilitiesSchema.nullish(),
  isDefault: z.boolean().optional(),
  isShared: z.boolean().optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

export const providerCreateSchema = providerInputSchema.extend({
  apiKey: z.string().trim().min(1, "请填写 API Key").max(1024),
});

/** 保存前试拉模型列表：可带已保存供应商的 id，复用其密钥。 */
export const providerModelsSchema = z.object({
  baseUrl: baseUrlSchema,
  apiKey: z.string().trim().max(1024).optional(),
  providerId: z.uuid().optional(),
});

export type ProviderInput = z.infer<typeof providerInputSchema>;
export type ProviderCreateInput = z.infer<typeof providerCreateSchema>;
