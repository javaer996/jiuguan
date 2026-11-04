/** 创作工坊可生成的资产类型。单独成文件，避免客户端导入时带上 zod 校验。 */
export const AI_KINDS = [
  "character",
  "worldbook",
  "prompt",
  "style",
  "theme",
] as const;

export type AiKind = (typeof AI_KINDS)[number];

export const AI_KIND_LABELS: Record<AiKind, string> = {
  character: "角色卡",
  worldbook: "世界书",
  prompt: "提示词预设",
  style: "对话样式",
  theme: "聊天主题",
};
