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

export const DEFAULT_STATUS_TAGS = ["情绪", "好感度", "地点"];

export const DEFAULT_REPLY_OPTION_STYLES = [
  "温柔",
  "试探",
  "坚定",
  "俏皮",
];

export const DEFAULT_REPLY_OPTION_COUNT = 3;

export const STYLE_PRESETS: StylePreset[] = [
  {
    key: "tavern",
    name: "暖金酒馆",
    description: "经典圆角气泡、头像与时间，暖金点缀，适合大多数情景。",
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
    key: "immersive",
    name: "沉浸互动",
    description:
      "在对话上方显示人物状态与目标，每轮回复后给出不同风格的可选回复。",
    config: {
      layout: "bubble",
      showAvatars: true,
      showTimestamps: false,
      fontSize: 16,
      lineHeight: 1.8,
      maxWidth: 800,
      narrationQuotes: true,
      accentColor: "#5fa89a",
      showStatusTags: true,
      statusTags: [...DEFAULT_STATUS_TAGS],
      statusTagNotes: {
        情绪: "用 2-6 个字概括角色此刻最主要的情绪，不要替用户描述。",
        好感度:
          "用 0-100 的整数表示角色对用户的好感，可附一个态度词；根据最近对话中的言行缓慢变化。",
        地点: "角色当前所在的具体位置，优先沿用对话中已经出现的地点。",
      },
      showGoal: true,
      showReplyOptions: true,
      replyOptionStyles: [...DEFAULT_REPLY_OPTION_STYLES],
      replyOptionCount: DEFAULT_REPLY_OPTION_COUNT,
    },
  },
  {
    key: "messenger",
    name: "夜航频道",
    description:
      "紧凑的即时通讯气泡，小头像、短行距与贴边时间，像一场深夜手机对话。",
    config: {
      layout: "messenger",
      showAvatars: true,
      showTimestamps: true,
      fontSize: 15,
      lineHeight: 1.65,
      maxWidth: 760,
      narrationQuotes: true,
      accentColor: "#7aa7c7",
    },
  },
  {
    key: "novel",
    name: "夜色小说",
    description:
      "去掉气泡与头像，衬线字体、段首缩进与渐变首字下沉，像读一本深夜小说。",
    config: {
      layout: "novel",
      showAvatars: false,
      showTimestamps: false,
      fontSize: 17,
      lineHeight: 2,
      maxWidth: 720,
      narrationQuotes: true,
      accentColor: "#c9a45c",
      dropCap: true,
      dropCapColor: "#c9a45c",
      dropCapEffect: "gradient",
    },
  },
  {
    key: "letter",
    name: "旧信笺",
    description:
      "窄幅信纸、双线边框与纸面纹理，首字下沉并带一点微光，适合书信体与慢节奏叙事。",
    config: {
      layout: "document",
      showAvatars: false,
      showTimestamps: false,
      fontSize: 16,
      lineHeight: 1.9,
      maxWidth: 640,
      narrationQuotes: false,
      accentColor: "#a8644a",
      dropCap: true,
      dropCapColor: "#a8644a",
      dropCapEffect: "glow",
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
