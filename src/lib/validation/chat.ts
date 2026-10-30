import { z } from "zod";

export const sessionSettingsSchema = z.looseObject({
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  maxTokens: z.number().int().min(1).max(200_000).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  stop: z.array(z.string().max(200)).max(20).optional(),
  stream: z.boolean().optional(),
  contextWindow: z.number().int().min(512).max(4_000_000).optional(),
  maxContextMessages: z.number().int().min(2).max(200).optional(),
  authorNote: z.string().max(20_000).optional(),
  authorNoteMode: z.enum(["preset", "custom"]).optional(),
  authorNoteDepth: z.number().int().min(0).max(100).optional(),
  autoTitle: z.boolean().optional(),
  memoryEnabled: z.boolean().optional(),
  compressionEnabled: z.boolean().optional(),
  compressionThreshold: z.number().min(0.3).max(0.95).optional(),
  compressionKeepRecent: z.number().int().min(2).max(100).optional(),
});

export const chatCreateSchema = z.object({
  title: z.string().trim().max(160).optional(),
  characterId: z.uuid().nullish(),
  templateId: z.uuid().nullish(),
  providerId: z.uuid().nullish(),
  promptPresetId: z.uuid().nullish(),
  chatStyleId: z.uuid().nullish(),
  themeId: z.uuid().nullish(),
  outputSchemaId: z.uuid().nullish(),
  personaId: z.uuid().nullish(),
  worldbookIds: z.array(z.uuid()).max(20).optional(),
  settings: sessionSettingsSchema.optional(),
  greetingIndex: z.number().int().min(0).max(20).optional(),
});

export const chatUpdateSchema = z.object({
  title: z.string().trim().min(1).max(160).optional(),
  pinned: z.boolean().optional(),
  archived: z.boolean().optional(),
  model: z.string().trim().max(128).nullish(),
  providerId: z.uuid().nullish(),
  promptPresetId: z.uuid().nullish(),
  chatStyleId: z.uuid().nullish(),
  themeId: z.uuid().nullish(),
  outputSchemaId: z.uuid().nullish(),
  personaId: z.uuid().nullish(),
  worldbookIds: z.array(z.uuid()).max(20).nullish(),
  settings: sessionSettingsSchema.nullish(),
});

export const messageSendSchema = z.object({
  content: z.string().trim().min(1, "消息不能为空").max(100_000),
});

export const regenerateSchema = z.object({
  messageId: z.uuid().optional(),
});

export const memoryKindSchema = z.enum([
  "permanent",
  "hidden",
  "summary",
  "note",
]);

export const memoryCreateSchema = z.object({
  kind: memoryKindSchema.optional(),
  title: z.string().trim().max(160).nullish(),
  content: z.string().trim().min(1, "记忆内容不能为空").max(20_000),
  importance: z.number().int().min(1).max(10).optional(),
  enabled: z.boolean().optional(),
});

export const memoryUpdateSchema = z.object({
  kind: memoryKindSchema.optional(),
  title: z.string().trim().max(160).nullish(),
  content: z.string().trim().min(1).max(20_000).optional(),
  importance: z.number().int().min(1).max(10).optional(),
  enabled: z.boolean().optional(),
});

export type ChatCreateInput = z.infer<typeof chatCreateSchema>;
export type ChatUpdateInput = z.infer<typeof chatUpdateSchema>;
