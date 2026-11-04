import type { AiDraft } from "@/lib/ai/drafts";
import type { AiKind } from "@/lib/ai/kinds";
import type { CreativeBrief } from "@/lib/ai/studio-schema";

/** 可预览/覆盖的生成提示词：五种资产 + 灵感优化 + 世界书条目扩写。 */
export const STUDIO_PROMPT_KEYS = [
  "optimize",
  "character",
  "worldbook",
  "worldbookExpansion",
  "prompt",
  "style",
  "theme",
] as const;

export type StudioPromptKey = (typeof STUDIO_PROMPT_KEYS)[number];

export const STUDIO_PROMPT_LABELS: Record<StudioPromptKey, string> = {
  optimize: "灵感优化",
  character: "角色卡",
  worldbook: "世界书·大纲",
  worldbookExpansion: "世界书·扩写",
  prompt: "提示词预设",
  style: "对话样式",
  theme: "聊天主题",
};

export type StudioPromptPair = {
  system: string;
  user: string;
};

/** 只覆盖用户实际改过的字段；空字符串视为未覆盖。 */
export type StudioPromptOverrides = Partial<
  Record<StudioPromptKey, Partial<StudioPromptPair>>
>;

export type StudioPromptPreview = {
  defaults: Record<StudioPromptKey, StudioPromptPair>;
  effective: Record<StudioPromptKey, StudioPromptPair>;
  enrichedIdea: string;
};

export type StudioStreamEvent =
  | {
      type: "start";
      kinds: AiKind[];
      model: string;
      providerName: string;
    }
  | { type: "kind_start"; kind: AiKind }
  | {
      type: "progress";
      kind: AiKind;
      phase?: "outline" | "expand";
      done?: number;
      total?: number;
      message?: string;
    }
  | {
      type: "draft";
      kind: AiKind;
      draft: AiDraft;
      warnings?: string[];
    }
  | { type: "kind_error"; kind: AiKind; message: string }
  | { type: "done"; completed: AiKind[]; failed: AiKind[] }
  | { type: "error"; message: string };

export type StudioSaveResult = {
  template: { id: string; href: string };
  assets: Partial<Record<AiKind, { id: string; href: string }>>;
  /** 本次根据纲要新建的用户身份。 */
  persona?: { id: string; name: string };
  skipped: AiKind[];
};

export type StudioSavedState = {
  version: number;
  idea: string;
  brief: CreativeBrief | null;
  briefSourceIdea: string;
  drafts: Partial<Record<AiKind, AiDraft>>;
  overrides: StudioPromptOverrides;
  providerId: string;
  selectedKinds: AiKind[];
  worldbookEntryCount: number;
  personaId: string;
  personaName: string;
  personaDescription: string;
  manualTemplateName: string;
  manualTemplateDescription: string;
  saved: { result: StudioSaveResult; signature: string } | null;
};

export type StudioKindStatus = {
  status: "idle" | "queued" | "running" | "done" | "error";
  step?: string;
  error?: string;
  warnings?: string[];
};
