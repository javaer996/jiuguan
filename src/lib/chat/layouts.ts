import type { StyleConfig } from "@/db/schema/types";

export type ChatLayout = NonNullable<StyleConfig["layout"]>;

export const CHAT_LAYOUTS: {
  value: ChatLayout;
  label: string;
  description: string;
}[] = [
  {
    value: "bubble",
    label: "气泡对话",
    description: "圆角气泡、头像与时间，像坐在同一张桌子边聊天。",
  },
  {
    value: "messenger",
    label: "即时通讯",
    description: "紧凑短气泡、贴边时间与小头像，像深夜里的手机对话。",
  },
  {
    value: "novel",
    label: "小说排版",
    description: "无气泡的书籍排版，衬线字体、段首缩进与首字下沉。",
  },
  {
    value: "document",
    label: "文档信笺",
    description: "纸面纹理、双线边框与首字下沉，适合书信体叙事。",
  },
];

export function isBubbleLayout(layout: ChatLayout) {
  return layout === "bubble" || layout === "messenger";
}

export function layoutLabel(layout: string | null | undefined) {
  return (
    CHAT_LAYOUTS.find((item) => item.value === layout)?.label ?? "自定义布局"
  );
}
