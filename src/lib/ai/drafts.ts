import { z } from "zod";
import {
  characterInputSchema,
  chatStyleInputSchema,
  promptBlockSchema,
  promptPresetInputSchema,
  styleConfigSchema,
  themeInputSchema,
  worldbookEntryInputSchema,
  worldbookInputSchema,
} from "@/lib/validation/content";
import { sanitizeThemeTokensSafe, THEME_TOKENS } from "@/lib/theme/tokens";

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

const characterDraftSchema = characterInputSchema.extend({
  description: z.string().trim().min(20, "角色描述太短").max(50_000),
  personality: z.string().trim().min(10, "性格描述太短").max(20_000),
  scenario: z.string().trim().min(10, "场景描述太短").max(20_000),
  firstMessage: z.string().trim().min(20, "开场白太短").max(20_000),
});

const worldbookDraftSchema = worldbookInputSchema.extend({
  entries: z
    .array(
      worldbookEntryInputSchema.extend({
        content: z.string().trim().min(10, "条目内容太短").max(200_000),
      }),
    )
    .min(2, "至少需要 2 个条目")
    .max(20),
});

const promptBlockDraftSchema = promptBlockSchema.omit({ id: true });

const promptDraftSchema = promptPresetInputSchema.extend({
  systemPrompt: z.string().trim().min(10, "系统提示词太短").max(50_000),
  blocks: z.array(promptBlockDraftSchema).max(30).optional(),
});

const styleDraftSchema = chatStyleInputSchema.extend({
  config: styleConfigSchema,
});

const themeDraftSchema = themeInputSchema.extend({
  description: z.string().trim().min(10, "主题说明太短").max(2000),
  tokens: z
    .record(z.string(), z.string().max(200))
    .transform((tokens) => sanitizeThemeTokensSafe(tokens))
    .refine(
      (tokens) =>
        Object.keys(tokens).length >= 4 &&
        Boolean(tokens["--background"]) &&
        Boolean(tokens["--foreground"]),
      "主题至少需要背景、正文等 4 个合法变量",
    ),
});

export const aiDraftSchemas = {
  character: characterDraftSchema,
  worldbook: worldbookDraftSchema,
  prompt: promptDraftSchema,
  style: styleDraftSchema,
  theme: themeDraftSchema,
} satisfies Record<AiKind, z.ZodType>;

export type CharacterDraft = z.infer<typeof characterDraftSchema>;
export type WorldbookDraft = z.infer<typeof worldbookDraftSchema>;
export type PromptDraft = z.infer<typeof promptDraftSchema>;
export type StyleDraft = z.infer<typeof styleDraftSchema>;
export type ThemeDraft = z.infer<typeof themeDraftSchema>;

export type AiDraftByKind = {
  character: CharacterDraft;
  worldbook: WorldbookDraft;
  prompt: PromptDraft;
  style: StyleDraft;
  theme: ThemeDraft;
};

export type AiDraft = AiDraftByKind[AiKind];

export function parseAiDraft<K extends AiKind>(
  kind: K,
  value: unknown,
): AiDraftByKind[K] {
  const result = aiDraftSchemas[kind].safeParse(value);
  if (!result.success) {
    throw new Error(
      result.error.issues
        .slice(0, 3)
        .map((issue) => `${issue.path.join(".") || "/"} ${issue.message}`)
        .join("；"),
    );
  }
  return result.data as AiDraftByKind[K];
}

/** 单个创作类型的系统提示词与用户消息模板。 */
export type GenerationKindPrompt = {
  /** 追加在通用规则之后，描述该类型需要输出的 JSON。 */
  system: string;
  /** 用户消息模板，{{idea}} 会替换为创作工坊里填写的灵感。 */
  user: string;
};

export type GenerationPromptSettings = {
  sharedRules: string;
  kinds: Record<AiKind, GenerationKindPrompt>;
};

function defaultKindPrompts(): Record<AiKind, GenerationKindPrompt> {
  return {
    character: {
      system: [
        "创作一张角色卡，JSON 字段如下：",
        JSON.stringify(
          {
            name: "角色名，2-12 个汉字",
            tagline: "一句话简介，30 字以内",
            description: "外貌、身份、经历与说话方式，200-600 字",
            personality: "性格与行为逻辑，80-200 字",
            scenario: "故事开场时的场景，80-200 字",
            firstMessage:
              "角色第一人称开场白，包含动作与环境描写，120-300 字",
            exampleDialogue:
              "2-3 轮示例对话，使用 {{user}} 与 {{char}} 占位",
            systemPrompt: "扮演指令，60 字以内",
            tags: ["3-6 个标签"],
          },
          null,
          2,
        ),
      ].join("\n"),
      user: "请根据这个灵感创作角色卡：\n{{idea}}",
    },

    worldbook: {
      system: [
        "创作一本世界书，JSON 字段如下：",
        JSON.stringify(
          {
            name: "世界书名称",
            description: "世界观简介，100 字以内",
            scanDepth: 4,
            tokenBudget: 2048,
            recursive: false,
            entries: [
              {
                name: "条目名称",
                keys: ["触发关键词"],
                secondaryKeys: [],
                content: "设定内容，120-300 字",
                constant: false,
                selective: true,
                position: "after_char",
                depth: 4,
                enabled: true,
              },
            ],
          },
          null,
          2,
        ),
        "生成 4-8 个条目。关键词要具体，避免过于宽泛的常用词；条目之间不要重复。",
      ].join("\n"),
      user: "请根据这个灵感创作世界书：\n{{idea}}",
    },

    prompt: {
      system: [
        "创作一套提示词预设，JSON 字段如下：",
        JSON.stringify(
          {
            name: "预设名称",
            description: "适用场景说明",
            systemPrompt: "基础系统提示词，定义叙事口吻与规则",
            postHistoryInstructions: "历史消息之后的补充指令",
            blocks: [
              {
                name: "世界书",
                role: "system",
                content: "",
                enabled: true,
                position: "main",
                marker: "worldbook",
              },
              {
                name: "对话历史",
                role: "system",
                content: "",
                enabled: true,
                position: "main",
                marker: "chat_history",
              },
            ],
            variables: { tone: "克制、细腻" },
          },
          null,
          2,
        ),
        "blocks 的 marker 可用 char/user/persona/worldbook/chat_history/author_note；position 可用 main/pre_history/post_history/depth。",
        "至少包含 worldbook 与 chat_history 两个 marker 块；不要输出 id 字段。",
      ].join("\n"),
      user: "请根据这个灵感创作提示词预设：\n{{idea}}",
    },

    style: {
      system: [
        "设计一套对话样式，JSON 字段如下：",
        JSON.stringify(
          {
            name: "样式名称",
            description: "视觉气质说明",
            config: {
              layout: "bubble",
              fontSize: 16,
              lineHeight: 1.8,
              showAvatars: true,
              showTimestamps: true,
              maxWidth: 860,
              narrationQuotes: true,
              accentColor: "#c9a45c",
            },
          },
          null,
          2,
        ),
        "layout 可选 bubble/novel/messenger/document；fontSize 10-28；lineHeight 1-3；maxWidth 400-1600。",
        "只使用合法的十六进制颜色，不要输出 customCss。",
      ].join("\n"),
      user: "请根据这个灵感设计对话样式：\n{{idea}}",
    },

    theme: {
      system: [
        "设计一套聊天主题，JSON 字段如下：",
        JSON.stringify(
          {
            name: "主题名称",
            description: "主题气质说明，40-120 字",
            mode: "dark",
            tokens: {
              "--background": "#0d0b12",
              "--foreground": "#ece7df",
              "--card": "#16131d",
              "--card-foreground": "#ece7df",
              "--border": "rgba(255, 255, 255, 0.08)",
              "--primary": "#e0a45e",
              "--primary-foreground": "#1a1208",
              "--accent": "#2a2434",
              "--accent-foreground": "#f0c987",
              "--secondary": "#241f2e",
              "--secondary-foreground": "#ece7df",
              "--muted": "#241f2e",
              "--muted-foreground": "#9a93a8",
              "--radius": "0.75rem",
            },
            customCss: null,
            backgroundUrl: null,
          },
          null,
          2,
        ),
        `tokens 只能使用这些键：${THEME_TOKENS.map((token) => token.key).join("、")}。`,
        "颜色使用十六进制或 rgba()；字体使用合法字体列表；圆角使用 rem 或 px。",
        "不要输出 backgroundUrl，customCss 可留空；深色主题要保证正文与背景有足够对比。",
      ].join("\n"),
      user: "请根据这个灵感设计聊天主题：\n{{idea}}",
    },
  };
}

export const DEFAULT_GENERATION_PROMPTS: GenerationPromptSettings = {
  sharedRules: [
    "你正在为中文 AI 角色扮演酒馆「醉语」创作内容。",
    "只输出一个合法 JSON 对象，不要代码块、不要 Markdown、不要额外解释。",
    "所有文本使用简体中文，具体、有画面感，避免空泛套话。",
    "不要替 {{user}} 行动或说话；不要使用真实公众人物姓名。",
  ].join("\n"),
  kinds: defaultKindPrompts(),
};

/** 允许管理员覆盖通用规则、当前类型的系统提示词和用户消息模板。 */
export type GenerationPromptOverride = {
  sharedRules?: string;
  system?: string;
  user?: string;
};

export function buildGenerationPrompt(
  kind: AiKind,
  idea: string,
  override?: GenerationPromptOverride,
) {
  const fallback = DEFAULT_GENERATION_PROMPTS.kinds[kind];
  const sharedRules = (
    override?.sharedRules ?? DEFAULT_GENERATION_PROMPTS.sharedRules
  ).trim();
  const kindSystem = (override?.system ?? fallback.system).trim();
  const userTemplate = override?.user ?? fallback.user;
  const system = [sharedRules, kindSystem].filter(Boolean).join("\n");
  const user = userTemplate.includes("{{idea}}")
    ? userTemplate.replaceAll("{{idea}}", idea.trim())
    : `${userTemplate.trim()}\n\n${idea.trim()}`;

  return { system, user };
}
