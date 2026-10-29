"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  Lightbulb,
  Loader2,
  Paintbrush,
  Palette,
  ScrollText,
  Sparkles,
  UserRound,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { StylePreview } from "@/components/styles/style-editor";
import { ThemePreview } from "@/components/themes/theme-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_KIND_LABELS,
  type AiDraft,
  type AiKind,
  type CharacterDraft,
  type PromptDraft,
  type StyleDraft,
  type ThemeDraft,
  type WorldbookDraft,
} from "@/lib/ai/drafts";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/utils";

type ProviderOption = {
  id: string;
  name: string;
  model: string;
  isDefault: boolean;
};

type StudioResult = {
  kind: AiKind;
  draft: AiDraft;
  model: string;
};

const KIND_META: Record<
  AiKind,
  { label: string; description: string; icon: typeof UserRound }
> = {
  character: {
    label: "角色卡",
    description: "姓名、性格、场景与开场白",
    icon: UserRound,
  },
  worldbook: {
    label: "世界书",
    description: "世界观条目与触发关键词",
    icon: BookOpen,
  },
  prompt: {
    label: "提示词",
    description: "系统提示词、注入块与变量",
    icon: ScrollText,
  },
  style: {
    label: "对话样式",
    description: "排版、字号、配色与气泡",
    icon: Palette,
  },
  theme: {
    label: "聊天主题",
    description: "聊天页色板、背景与氛围",
    icon: Paintbrush,
  },
};

const KIND_ORDER: AiKind[] = [
  "character",
  "worldbook",
  "prompt",
  "style",
  "theme",
];

const SAMPLES: Record<AiKind, string[]> = {
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

function DraftPreview({
  kind,
  draft,
}: {
  kind: AiKind;
  draft: AiDraft;
}) {
  if (kind === "character") {
    const data = draft as CharacterDraft;
    return (
      <div className="space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-semibold">{data.name}</h2>
            {data.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full">
                {tag}
              </Badge>
            ))}
          </div>
          {data.tagline && (
            <p className="mt-1.5 text-sm text-primary/80">{data.tagline}</p>
          )}
        </div>
        <PreviewSection title="角色描述">{data.description}</PreviewSection>
        <PreviewSection title="性格">{data.personality}</PreviewSection>
        <PreviewSection title="场景">{data.scenario}</PreviewSection>
        <PreviewSection title="开场白">
          <span className="italic">{data.firstMessage}</span>
        </PreviewSection>
        {data.exampleDialogue && (
          <PreviewSection title="示例对话">
            {data.exampleDialogue}
          </PreviewSection>
        )}
      </div>
    );
  }

  if (kind === "worldbook") {
    const data = draft as WorldbookDraft;
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">{data.name}</h2>
          {data.description && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {data.description}
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            {data.entries.length} 个条目 · 扫描深度 {data.scanDepth ?? 4} · 预算{" "}
            {data.tokenBudget ?? 2048} tokens
          </p>
        </div>
        <div className="space-y-3">
          {data.entries.map((entry, index) => (
            <div
              key={`${entry.name}-${index}`}
              className="rounded-xl border border-border/50 bg-background/30 p-3.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium">{entry.name}</h3>
                {entry.constant && (
                  <Badge variant="outline" className="rounded-full">
                    常驻
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {entry.position ?? "after_char"}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(entry.keys ?? []).map((key) => (
                  <span
                    key={key}
                    className="rounded bg-secondary/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {key}
                  </span>
                ))}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {entry.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "prompt") {
    const data = draft as PromptDraft;
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">{data.name}</h2>
          {data.description && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {data.description}
            </p>
          )}
        </div>
        <PreviewSection title="系统提示词">
          {data.systemPrompt}
        </PreviewSection>
        {data.postHistoryInstructions && (
          <PreviewSection title="历史后指令">
            {data.postHistoryInstructions}
          </PreviewSection>
        )}
        {data.blocks && data.blocks.length > 0 && (
          <div>
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              提示词块
            </h3>
            <div className="mt-2 space-y-2">
              {data.blocks.map((block, index) => (
                <div
                  key={`${block.name}-${index}`}
                  className="rounded-xl border border-border/50 bg-background/30 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium">{block.name}</span>
                    <Badge variant="outline" className="rounded-full">
                      {block.marker ?? block.position}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {block.role} · {block.position}
                    </span>
                  </div>
                  {block.content && (
                    <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
                      {block.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {data.variables && Object.keys(data.variables).length > 0 && (
          <PreviewSection title="变量">
            {Object.entries(data.variables)
              .map(([key, value]) => `${key} = ${value}`)
              .join("\n")}
          </PreviewSection>
        )}
      </div>
    );
  }

  if (kind === "style") {
    const data = draft as StyleDraft;
    const config = data.config ?? {};
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">{data.name}</h2>
          {data.description && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {data.description}
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            {config.layout ?? "bubble"} · {config.fontSize ?? 16}px · 行高{" "}
            {config.lineHeight ?? 1.8} · 强调色 {config.accentColor ?? "默认"}
          </p>
        </div>
        <StylePreview config={config} />
      </div>
    );
  }

  const data = draft as ThemeDraft;
  const swatches = [
    data.tokens["--background"],
    data.tokens["--foreground"],
    data.tokens["--primary"],
    data.tokens["--secondary"],
    data.tokens["--accent"],
  ].filter((color): color is string => Boolean(color));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold">{data.name}</h2>
        {data.description && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {data.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {data.mode === "light"
              ? "浅色"
              : data.mode === "dark"
                ? "深色"
                : "通用"}{" "}
            · {Object.keys(data.tokens).length} 个变量
          </span>
          <span className="flex items-center gap-1">
            {swatches.map((color) => (
              <span
                key={color}
                className="size-3.5 rounded-full border border-border/60"
                style={{ background: color }}
              />
            ))}
          </span>
        </div>
      </div>
      <ThemePreview
        tokens={data.tokens}
        backgroundUrl={data.backgroundUrl}
        customCss={data.customCss}
        title={data.name}
        subtitle="AI 生成的主题预览"
      />
    </div>
  );
}

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
        {children}
      </p>
    </div>
  );
}

export function AiStudio({ providers }: { providers: ProviderOption[] }) {
  const defaultProvider =
    providers.find((provider) => provider.isDefault) ?? providers[0];
  const [kind, setKind] = useState<AiKind>("character");
  const [idea, setIdea] = useState("");
  const [providerId, setProviderId] = useState(defaultProvider?.id ?? "");
  const [result, setResult] = useState<StudioResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedHref, setSavedHref] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function switchKind(next: AiKind) {
    setKind(next);
    setResult(null);
    setSavedHref(null);
    setError(null);
  }

  async function generate() {
    if (generating) return;
    if (idea.trim().length < 2) {
      toast.error("先写下一点灵感吧");
      return;
    }

    setGenerating(true);
    setError(null);
    setSavedHref(null);
    try {
      const data = await apiFetch<StudioResult>("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({
          kind,
          idea: idea.trim(),
          providerId: providerId || null,
        }),
      });
      setResult(data);
      toast.success("生成完成，先看看预览");
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : "生成失败，请稍后再试";
      setError(message);
      toast.error(message);
    } finally {
      setGenerating(false);
    }
  }

  async function save() {
    if (!result || saving || savedHref) return;
    setSaving(true);
    try {
      const data = await apiFetch<{ id: string; href: string }>("/api/ai/apply", {
        method: "POST",
        body: JSON.stringify({ kind: result.kind, draft: result.draft }),
      });
      setSavedHref(data.href);
      toast.success("已保存到你的资产");
    } catch (err) {
      toast.error(
        err instanceof ApiClientError ? err.message : "保存失败",
      );
    } finally {
      setSaving(false);
    }
  }

  async function copyJson() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(result.draft, null, 2));
      toast.success("JSON 已复制");
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  }

  const meta = KIND_META[kind];

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
          <Label className="text-xs text-muted-foreground">生成类型</Label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {KIND_ORDER.map((item) => {
              const itemMeta = KIND_META[item];
              const Icon = itemMeta.icon;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => switchKind(item)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-xl border px-3 py-2.5 text-left transition-colors",
                    kind === item
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:border-primary/25 hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  <span className="text-xs font-medium">{itemMeta.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {meta.description}
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="studio-idea">灵感</Label>
            <span className="text-[10px] text-muted-foreground">
              {idea.length}/2000
            </span>
          </div>
          <Textarea
            id="studio-idea"
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="描述你想要的角色、世界或氛围……"
            maxLength={2000}
            className="mt-2 min-h-36 resize-none rounded-xl bg-background/50 leading-relaxed"
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {SAMPLES[kind].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setIdea(sample)}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-left text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary"
              >
                <Lightbulb className="size-3" />
                {sample.length > 24 ? `${sample.slice(0, 24)}…` : sample}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2">
            <Label>使用供应商</Label>
            {providers.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 px-3 py-3 text-[11px] leading-relaxed text-muted-foreground">
                还没有可用的 AI 供应商。
                <Link href="/settings" className="ml-1 text-primary hover:underline">
                  去设置接入
                </Link>
              </div>
            ) : (
              <Select
                value={providerId || "default"}
                onValueChange={(value) =>
                  setProviderId(value === "default" ? "" : value)
                }
              >
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="选择供应商" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">跟随默认供应商</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name} · {provider.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <Button
            onClick={() => void generate()}
            disabled={generating || providers.length === 0}
            className="mt-4 w-full rounded-xl shadow-glow"
          >
            {generating ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Wand2 data-icon="inline-start" />
            )}
            {generating ? "正在生成…" : "生成草稿"}
          </Button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            生成会消耗你自己的 API 额度，结果先预览、不会自动保存。
          </p>
        </div>
      </div>

      <div className="min-h-[520px] rounded-2xl border border-border/60 bg-card/30 p-5 sm:p-6">
        {error && (
          <div className="mb-4 rounded-xl border border-destructive/25 bg-destructive/5 px-3.5 py-2.5 text-xs text-destructive">
            {error}
          </div>
        )}

        {!result ? (
          <div className="flex min-h-[460px] flex-col items-center justify-center text-center">
            <span className="flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-glow">
              <Sparkles className="size-7" />
            </span>
            <h2 className="mt-5 font-display text-xl font-medium">
              灵感正在等一盏灯
            </h2>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
              在左侧写下灵感，选择要生成的资产类型。生成后会在这里实时预览，确认满意再保存。
            </p>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
              <div>
                <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
                  {AI_KIND_LABELS[result.kind]} · {result.model}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  预览确认后再保存，保存后可以继续在编辑器中调整。
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void copyJson()}
                  className="rounded-lg"
                >
                  <Copy data-icon="inline-start" />
                  复制 JSON
                </Button>
                {savedHref ? (
                  <Button size="sm" asChild className="rounded-lg">
                    <Link href={savedHref}>
                      <Check data-icon="inline-start" />
                      已保存，去编辑
                      <ArrowRight data-icon="inline-end" />
                    </Link>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => void save()}
                    disabled={saving}
                    className="rounded-lg"
                  >
                    {saving ? (
                      <Loader2 data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <Check data-icon="inline-start" />
                    )}
                    保存到我的资产
                  </Button>
                )}
              </div>
            </div>

            <div className="pt-5">
              <DraftPreview kind={result.kind} draft={result.draft} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
