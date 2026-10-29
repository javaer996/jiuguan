"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Loader2,
  Paintbrush,
  Palette,
  RotateCcw,
  Save,
  ScrollText,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_KINDS,
  type AiKind,
  type GenerationPromptSettings,
} from "@/lib/ai/drafts";
import { ApiClientError, apiFetch } from "@/lib/client/api";

const KIND_ORDER: AiKind[] = [...AI_KINDS];

const KIND_META: Record<
  AiKind,
  { label: string; description: string; icon: LucideIcon }
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
    label: "提示词预设",
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

type PromptResponse = {
  prompts: GenerationPromptSettings;
  defaults: GenerationPromptSettings;
};

function cloneSettings(value: GenerationPromptSettings) {
  return structuredClone(value);
}

function isSame(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function PromptPreview({
  kind,
  form,
}: {
  kind: AiKind;
  form: GenerationPromptSettings;
}) {
  const system = [
    form.sharedRules.trim(),
    form.kinds[kind].system.trim(),
  ]
    .filter(Boolean)
    .join("\n");
  const user = form.kinds[kind].user.replaceAll(
    "{{idea}}",
    "（用户在这里填写的灵感）",
  );

  return (
    <details className="mt-4 rounded-xl border border-border/50 bg-background/30">
      <summary className="cursor-pointer list-none px-3.5 py-2.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground">
        查看最终拼接效果
      </summary>
      <div className="space-y-3 border-t border-border/40 p-3.5">
        <div>
          <p className="text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            System
          </p>
          <pre className="mt-1 max-h-60 overflow-auto rounded-lg bg-background/60 p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words">
            {system || "（通用规则和各类型系统提示词都为空）"}
          </pre>
        </div>
        <div>
          <p className="text-[10px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            User
          </p>
          <pre className="mt-1 max-h-40 overflow-auto rounded-lg bg-background/60 p-3 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words">
            {user}
          </pre>
        </div>
      </div>
    </details>
  );
}

export function AdminAiPromptsForm({
  initial,
  defaults,
}: {
  initial: GenerationPromptSettings;
  defaults: GenerationPromptSettings;
}) {
  const router = useRouter();
  const [form, setForm] = useState<GenerationPromptSettings>(initial);
  const [baseline, setBaseline] = useState<GenerationPromptSettings>(initial);
  const [tab, setTab] = useState("shared");
  const [saving, setSaving] = useState(false);

  const dirty = useMemo(() => !isSame(form, baseline), [form, baseline]);
  const customCount = useMemo(() => {
    const shared = isSame(form.sharedRules, defaults.sharedRules) ? 0 : 1;
    return (
      shared +
      KIND_ORDER.filter(
        (kind) => !isSame(form.kinds[kind], defaults.kinds[kind]),
      ).length
    );
  }, [form, defaults]);

  function setSharedRules(value: string) {
    setForm((previous) => ({ ...previous, sharedRules: value }));
  }

  function setKind(
    kind: AiKind,
    field: "system" | "user",
    value: string,
  ) {
    setForm((previous) => ({
      ...previous,
      kinds: {
        ...previous.kinds,
        [kind]: { ...previous.kinds[kind], [field]: value },
      },
    }));
  }

  function resetKind(kind: AiKind) {
    setForm((previous) => ({
      ...previous,
      kinds: {
        ...previous.kinds,
        [kind]: { ...defaults.kinds[kind] },
      },
    }));
  }

  function resetShared() {
    setForm((previous) => ({
      ...previous,
      sharedRules: defaults.sharedRules,
    }));
  }

  function resetAll() {
    setForm(cloneSettings(defaults));
    toast.info("已恢复为内置默认，点击保存后生效");
  }

  async function save() {
    if (saving) return;
    const invalidKind = KIND_ORDER.find(
      (kind) => !form.kinds[kind].user.includes("{{idea}}"),
    );
    if (invalidKind) {
      setTab(invalidKind);
      toast.error(
        `${KIND_META[invalidKind].label}的用户消息模板必须包含 {{idea}} 占位符`,
      );
      return;
    }

    setSaving(true);
    try {
      const data = await apiFetch<PromptResponse>("/api/admin/ai-prompts", {
        method: "PATCH",
        body: JSON.stringify(form),
      });
      setForm(data.prompts);
      setBaseline(data.prompts);
      toast.success("创作提示词已保存");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "保存失败",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="font-display text-base font-medium">
                AI 创作生成提示词
              </h2>
            </div>
            <p className="mt-1.5 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
              这里控制「创作工坊」生成角色卡、世界书、提示词预设、对话样式和聊天主题时发给
              AI 的系统提示词。保存后对全站用户生效，仅管理员可以查看和修改。
            </p>
          </div>
          <Badge variant={customCount > 0 ? "default" : "secondary"}>
            {customCount > 0 ? `${customCount} 处自定义` : "全部使用内置默认"}
          </Badge>
        </div>
        <div className="mt-3 rounded-xl border border-border/40 bg-background/30 px-3.5 py-2.5 text-[11px] leading-relaxed text-muted-foreground">
          通用规则会拼接在每个类型的系统提示词前面。各类型提示词里请保留 JSON
          字段说明，否则创作工坊可能无法解析 AI 的返回结果。对话中实际使用的提示词预设仍由用户在「提示词」页面管理。
        </div>
      </section>

      <Tabs value={tab} onValueChange={setTab} className="gap-4">
        <div className="-mx-1 overflow-x-auto pb-1">
          <TabsList
            variant="line"
            className="h-auto min-w-max justify-start gap-0.5 bg-transparent p-0"
          >
            <TabsTrigger
              value="shared"
              className="h-9 flex-none rounded-lg px-3 text-xs"
            >
              <Sparkles className="size-3.5" />
              通用规则
            </TabsTrigger>
            {KIND_ORDER.map((kind) => {
              const meta = KIND_META[kind];
              const custom = !isSame(form.kinds[kind], defaults.kinds[kind]);
              return (
                <TabsTrigger
                  key={kind}
                  value={kind}
                  className="h-9 flex-none rounded-lg px-3 text-xs"
                >
                  <meta.icon className="size-3.5" />
                  {meta.label}
                  {custom && (
                    <span className="size-1.5 rounded-full bg-primary" />
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="shared">
          <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-medium">通用规则</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  会加在每种创作类型的最前面，适合放全局口吻、JSON
                  约束和安全规则。留空则只使用各类型自己的系统提示词。
                </p>
              </div>
              <Badge
                variant={
                  isSame(form.sharedRules, defaults.sharedRules)
                    ? "secondary"
                    : "default"
                }
              >
                {isSame(form.sharedRules, defaults.sharedRules)
                  ? "内置默认"
                  : "已自定义"}
              </Badge>
            </div>

            <div className="mt-4">
              <Label htmlFor="shared-rules">通用系统规则</Label>
              <Textarea
                id="shared-rules"
                value={form.sharedRules}
                onChange={(event) => setSharedRules(event.target.value)}
                maxLength={20_000}
                className="mt-1.5 min-h-48 rounded-xl bg-background/50 font-mono text-[11px] leading-relaxed sm:text-xs"
              />
              <div className="mt-1 flex items-center justify-between gap-3 text-[10px] text-muted-foreground">
                <span>支持 {"{{user}}"} 与 {"{{char}}"} 占位符。</span>
                <span>{form.sharedRules.length}/20000</span>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetShared}
                disabled={isSame(form.sharedRules, defaults.sharedRules)}
                className="rounded-lg"
              >
                <RotateCcw data-icon="inline-start" />
                恢复内置默认
              </Button>
            </div>
          </section>
        </TabsContent>

        {KIND_ORDER.map((kind) => {
          const meta = KIND_META[kind];
          const custom = !isSame(form.kinds[kind], defaults.kinds[kind]);
          return (
            <TabsContent key={kind} value={kind}>
              <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <meta.icon className="size-4" />
                    </span>
                    <div>
                      <h2 className="font-display text-base font-medium">
                        {meta.label}生成提示词
                      </h2>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                        {meta.description}。修改只影响创作工坊的这一种生成类型。
                      </p>
                    </div>
                  </div>
                  <Badge variant={custom ? "default" : "secondary"}>
                    {custom ? "已自定义" : "内置默认"}
                  </Badge>
                </div>

                <div className="mt-4 space-y-5">
                  <div>
                    <Label htmlFor={`${kind}-system`}>系统提示词</Label>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      会接在通用规则之后。建议保留 JSON 字段说明和字段约束。
                    </p>
                    <Textarea
                      id={`${kind}-system`}
                      value={form.kinds[kind].system}
                      onChange={(event) =>
                        setKind(kind, "system", event.target.value)
                      }
                      maxLength={50_000}
                      className="mt-1.5 min-h-64 rounded-xl bg-background/50 font-mono text-[11px] leading-relaxed sm:text-xs"
                    />
                    <div className="mt-1 text-right text-[10px] text-muted-foreground">
                      {form.kinds[kind].system.length}/50000
                    </div>
                  </div>

                  <div>
                    <Label htmlFor={`${kind}-user`}>用户消息模板</Label>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                      必须包含 {"{{idea}}"} 占位符，用户填写的灵感会替换到这里。
                    </p>
                    <Textarea
                      id={`${kind}-user`}
                      value={form.kinds[kind].user}
                      onChange={(event) =>
                        setKind(kind, "user", event.target.value)
                      }
                      maxLength={20_000}
                      className="mt-1.5 min-h-28 rounded-xl bg-background/50 font-mono text-[11px] leading-relaxed sm:text-xs"
                    />
                    <div className="mt-1 text-right text-[10px] text-muted-foreground">
                      {form.kinds[kind].user.length}/20000
                    </div>
                  </div>
                </div>

                <PromptPreview kind={kind} form={form} />

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => resetKind(kind)}
                    disabled={!custom}
                    className="rounded-lg"
                  >
                    <RotateCcw data-icon="inline-start" />
                    恢复本页默认
                  </Button>
                </div>
              </section>
            </TabsContent>
          );
        })}
      </Tabs>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/85 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="px-1 text-[11px] text-muted-foreground">
          {dirty ? "有未保存的修改" : "当前配置已保存"} · 仅管理员可见
        </p>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={resetAll}
            disabled={saving}
            className="rounded-xl"
          >
            <RotateCcw data-icon="inline-start" />
            恢复全部默认
          </Button>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || !dirty}
            className="rounded-xl shadow-glow"
          >
            {saving ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {saving ? "保存中…" : "保存提示词"}
          </Button>
        </div>
      </div>
    </div>
  );
}
