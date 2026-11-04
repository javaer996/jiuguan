import {
  BookOpen,
  Paintbrush,
  Palette,
  ScrollText,
  UserRound,
} from "lucide-react";
import { AI_KINDS, AI_KIND_LABELS, type AiKind } from "@/lib/ai/kinds";

export const KIND_ORDER: AiKind[] = [...AI_KINDS];

export const KIND_META: Record<
  AiKind,
  { label: string; description: string; icon: typeof UserRound }
> = {
  character: {
    label: AI_KIND_LABELS.character,
    description: "姓名、性格、场景与开场白",
    icon: UserRound,
  },
  worldbook: {
    label: AI_KIND_LABELS.worldbook,
    description: "世界观条目与触发关键词",
    icon: BookOpen,
  },
  prompt: {
    label: AI_KIND_LABELS.prompt,
    description: "系统提示词、注入块与变量",
    icon: ScrollText,
  },
  style: {
    label: AI_KIND_LABELS.style,
    description: "排版、字号、配色与气泡",
    icon: Palette,
  },
  theme: {
    label: AI_KIND_LABELS.theme,
    description: "聊天页色板、背景与氛围",
    icon: Paintbrush,
  },
};

export const SAMPLES: Record<AiKind, string[]> = {
  character: [
    "雨夜里经营旧书店的盲眼说书人，能听见书页里的秘密",
    "表面温和、实则记仇的宫廷药剂师",
  ],
  worldbook: [
    "一座被浓雾封锁的港口城市，渡轮只在午夜靠岸",
    "以梦境为货币的夜市，醒来后会忘记买过什么",
  ],
  prompt: [
    "克制、文学化的第二人称叙事，重视环境与留白",
    "轻快幽默的群像对话，节奏明快，少用长段描写",
  ],
  style: [
    "像深夜读信一样的窄幅排版，暖金与墨色",
    "即时通讯式的短气泡，适合轻松日常",
  ],
  theme: [
    "雨夜港口，青绿与雾灰，像旧灯照在湿石板上",
    "赛博都市的霓虹夜色，靛紫与电光青",
  ],
};
