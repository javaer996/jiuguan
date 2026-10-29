import type { PromptBlock, StyleConfig } from "@/db/schema/types";

export const DEFAULT_SYSTEM_PROMPT =
  "你正在扮演{{char}}。请始终保持角色一致，用第一人称回应{{user}}，自然地推进故事，不要代替{{user}}行动或说话。";

export const DEFAULT_POST_HISTORY_INSTRUCTIONS =
  "保持回复自然、有画面感，避免总结式复述。给{{user}}留下接话与行动的空间。";

export function defaultPromptBlocks(): PromptBlock[] {
  return [
    {
      id: "worldbook",
      name: "世界书",
      role: "system",
      content: "",
      enabled: true,
      position: "main",
      marker: "worldbook",
    },
    {
      id: "chat-history",
      name: "对话历史",
      role: "system",
      content: "",
      enabled: true,
      position: "main",
      marker: "chat_history",
    },
    {
      id: "author-note",
      name: "作者注",
      role: "system",
      content: "",
      enabled: true,
      position: "post_history",
      marker: "author_note",
    },
  ];
}

export type StylePreset = {
  key: string;
  name: string;
  description: string;
  config: StyleConfig;
};

export const STYLE_PRESETS: StylePreset[] = [
  {
    key: "tavern",
    name: "暖金酒馆",
    description: "默认的气泡对话，暖金与深色玻璃，适合大多数情景。",
    config: {
      layout: "bubble",
      showAvatars: true,
      showTimestamps: true,
      fontSize: 16,
      lineHeight: 1.8,
      maxWidth: 860,
      narrationQuotes: true,
    },
  },
  {
    key: "novel",
    name: "夜色小说",
    description: "去掉气泡与头像，像读一本深夜小说。",
    config: {
      layout: "novel",
      showAvatars: false,
      showTimestamps: false,
      fontSize: 17,
      lineHeight: 2,
      maxWidth: 720,
      narrationQuotes: true,
    },
  },
  {
    key: "letter",
    name: "旧信笺",
    description: "窄幅信纸排版，适合书信体与慢节奏叙事。",
    config: {
      layout: "document",
      showAvatars: false,
      showTimestamps: false,
      fontSize: 16,
      lineHeight: 1.9,
      maxWidth: 640,
      narrationQuotes: false,
    },
  },
];

export const DEFAULT_OUTPUT_SCHEMA: Record<string, unknown> = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  title: "叙事回复",
  properties: {
    narration: {
      type: "string",
      title: "正文",
      description: "角色的动作、环境与心理描写。",
      "x-ui": { component: "markdown", order: 1 },
    },
    speech: {
      type: "string",
      title: "对白",
      description: "角色说出口的话。",
      "x-ui": { component: "quote", order: 2 },
    },
    mood: {
      type: "string",
      title: "情绪",
      enum: ["平静", "温柔", "紧张", "悲伤", "愉悦"],
      "x-ui": { component: "badge", order: 3 },
    },
  },
  required: ["narration", "speech"],
  additionalProperties: false,
};
