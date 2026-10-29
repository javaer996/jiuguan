import { z } from "zod";

const tagSchema = z
  .string()
  .trim()
  .min(1, "标签不能为空")
  .max(16, "单个标签最多 16 个字");

export const plazaSubmitSchema = z.object({
  /** 作为快照来源的「我的对话模板」 */
  templateId: z.uuid(),
  /** 传入时为已投稿模板提交新版本 */
  plazaTemplateId: z.uuid().nullish(),
  title: z.string().trim().min(1, "请填写标题").max(80),
  summary: z.string().trim().max(500).optional(),
  categoryId: z.uuid().nullish(),
  tags: z.array(tagSchema).max(8, "最多 8 个标签").optional(),
  coverUrl: z.string().trim().max(1024).nullish(),
  changelog: z.string().trim().max(500).optional(),
});

export const plazaReviewSchema = z.object({
  rating: z.number().int().min(1, "请选择评分").max(5),
  content: z.string().trim().max(2000).optional(),
});

export const plazaModerationSchema = z.object({
  action: z.enum(["approve", "reject", "archive", "feature", "unfeature"]),
  reason: z.string().trim().max(500).optional(),
});

export type PlazaSubmitInput = z.infer<typeof plazaSubmitSchema>;
export type PlazaModerationInput = z.infer<typeof plazaModerationSchema>;
