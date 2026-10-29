"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { EditorSection } from "@/components/common/editor-section";
import { sanitizeCustomCssSafe } from "@/lib/css/sanitize";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { STYLE_PRESETS } from "@/lib/content/defaults";
import type { StyleConfig } from "@/db/schema/types";
import type { ChatStyleDTO } from "@/lib/types/content";
import { cn, withAlpha } from "@/lib/utils";

const LAYOUT_OPTIONS = [
  { value: "bubble", label: "气泡对话" },
  { value: "novel", label: "小说排版" },
  { value: "messenger", label: "即时通讯" },
  { value: "document", label: "文档信笺" },
] as const;

type StyleForm = {
  name: string;
  description: string;
  builtInKey: string;
  config: StyleConfig;
  customCss: string;
};

function toForm(style?: ChatStyleDTO): StyleForm {
  return {
    name: style?.name ?? "",
    description: style?.description ?? "",
    builtInKey: style?.builtInKey ?? "",
    config: style?.config ?? STYLE_PRESETS[0]!.config,
    customCss: style?.customCss ?? "",
  };
}

export function StylePreview({
  config,
  customCss,
  className,
}: {
  config: StyleConfig;
  customCss?: string | null;
  className?: string;
}) {
  const layout = config.layout ?? "bubble";
  const fontSize = config.fontSize ?? 16;
  const lineHeight = config.lineHeight ?? 1.8;
  const sanitizedCss = sanitizeCustomCssSafe(customCss);
  const accentStyle = (isUser: boolean) => {
    if (!config.accentColor) return {};
    if (layout === "novel") {
      return { borderLeftColor: withAlpha(config.accentColor, 0.45) };
    }
    if (layout === "document") {
      return { borderColor: withAlpha(config.accentColor, 0.2) };
    }
    return {
      borderColor: withAlpha(config.accentColor, isUser ? 0.18 : 0.24),
    };
  };
  const narration = config.narrationQuotes ? (
    <span
      className="zy-narration"
      style={{ color: config.narrationColor || undefined }}
    >
      「窗边吧。」
    </span>
  ) : (
    "「窗边吧。」"
  );

  return (
    <div
      className={cn(
        "zy-chat rounded-xl border border-border/60 bg-background p-4 text-foreground",
        className,
      )}
    >
      {sanitizedCss && <style>{sanitizedCss}</style>}
      <div
        className="mx-auto space-y-4"
        style={{
          maxWidth: config.maxWidth ?? 860,
          fontFamily: config.fontFamily || undefined,
          fontSize,
          lineHeight,
        }}
      >
        <div
          className={cn(
            "flex gap-3",
            layout === "bubble" || layout === "messenger"
              ? "flex-row-reverse"
              : "justify-end",
          )}
        >
          {config.showAvatars && (
            <span className="zy-avatar mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary/90 text-xs text-muted-foreground ring-1 ring-border/50 backdrop-blur-sm">
              你
            </span>
          )}
          <div className="flex min-w-0 flex-col items-end">
            <div
              className={cn(
                "zy-content text-left",
                layout === "bubble" || layout === "messenger"
                  ? cn(
                      "zy-bubble border border-primary/20 bg-primary/[0.08] px-4 py-2.5",
                      layout === "messenger" ? "rounded-xl" : "rounded-2xl",
                    )
                  : "border-l-2 border-primary/45 pl-3",
                layout === "novel" && "zy-novel",
                layout === "document" &&
                  "zy-document w-full rounded-xl border border-border/50 bg-card/75 px-4 py-3 shadow-soft backdrop-blur-sm",
              )}
              style={{
                ...accentStyle(true),
                ...(config.userBubble ? { background: config.userBubble } : {}),
              }}
            >
              <p className="text-muted-foreground">
                今晚的酒馆比往常安静。你要坐窗边，还是靠近炉火？
              </p>
            </div>
            {config.showTimestamps && (
              <p className="mt-1 text-[10px] text-muted-foreground/80">
                22:14
              </p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          {config.showAvatars && (
            <span className="zy-avatar mt-1 flex size-8 shrink-0 items-center justify-center rounded-lg bg-card/90 text-xs text-primary ring-1 ring-border/50 backdrop-blur-sm">
              她
            </span>
          )}
          <div className="flex min-w-0 flex-col items-start">
            <div
              className={cn(
                "zy-content text-left",
                layout === "bubble" || layout === "messenger"
                  ? cn(
                      "zy-bubble border border-primary/25 bg-card/80 px-4 py-2.5 backdrop-blur-sm",
                      layout === "messenger" ? "rounded-xl" : "rounded-2xl",
                    )
                  : "border-l-2 border-primary/45 pl-3",
                layout === "novel" && "zy-novel",
                layout === "document" &&
                  "zy-document w-full rounded-xl border border-border/50 bg-card/75 px-4 py-3 shadow-soft backdrop-blur-sm",
              )}
              style={{
                ...accentStyle(false),
                ...(config.assistantBubble
                  ? { background: config.assistantBubble }
                  : {}),
              }}
            >
              <p>
                {narration}她替你拉开椅子，炉火的光落在杯沿上，
                像一小片融化的金子。
              </p>
            </div>
            {config.showTimestamps && (
              <p className="mt-1 text-[10px] text-muted-foreground/80">
                22:15
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StyleEditor({ initial }: { initial?: ChatStyleDTO }) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [form, setForm] = useState<StyleForm>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const saveRef = useRef<() => void>(() => {});

  function set<K extends keyof StyleForm>(key: K, value: StyleForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function setConfig<K extends keyof StyleConfig>(
    key: K,
    value: StyleConfig[K],
  ) {
    setForm((previous) => ({
      ...previous,
      config: { ...previous.config, [key]: value },
    }));
  }

  function applyPreset(key: string) {
    const preset = STYLE_PRESETS.find((item) => item.key === key);
    if (!preset) return;
    setForm((previous) => ({
      ...previous,
      builtInKey: preset.key,
      name: previous.name || preset.name,
      description: previous.description || preset.description,
      config: { ...preset.config },
    }));
    toast.success(`已应用「${preset.name}」预设`);
  }

  async function handleSave() {
    if (saving) return;
    if (!form.name.trim()) {
      toast.error("先给样式起一个名字");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        builtInKey: form.builtInKey || null,
        config: form.config,
        customCss: form.customCss || null,
      };

      const result = await apiFetch<{ style: ChatStyleDTO }>(
        isEdit ? `/api/styles/${initial!.id}` : "/api/styles",
        {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      toast.success(isEdit ? "样式已保存" : "对话样式已创建");
      if (!isEdit) {
        router.replace(`/styles/${result.style.id}`);
      }
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "保存失败，请稍后再试",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!initial || deleting) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/styles/${initial.id}`, { method: "DELETE" });
      toast.success("对话样式已删除");
      router.push("/styles");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "删除失败");
      setDeleting(false);
    }
  }

  useEffect(() => {
    saveRef.current = () => {
      void handleSave();
    };
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="min-h-dvh">
      <div className="sticky top-16 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl lg:top-0">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link href="/styles" aria-label="返回样式列表">
                <ArrowLeft />
              </Link>
            </Button>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                Chat style
              </p>
              <h1 className="truncate font-display text-lg font-medium">
                {isEdit ? form.name || "未命名样式" : "新建对话样式"}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-xl text-muted-foreground hover:text-destructive"
                    disabled={deleting}
                    aria-label="删除样式"
                  >
                    {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删除这套样式？</AlertDialogTitle>
                    <AlertDialogDescription>
                      使用它的模板会失去引用，已开始的对话仍会保留当时的样式快照。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>再想想</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleDelete()}>
                      删除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded-xl shadow-glow"
            >
              {saving ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Save data-icon="inline-start" />
              )}
              保存
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-10 lg:py-10">
        <div className="space-y-5">
          <EditorSection title="样式信息" description="名称与说明会显示在样式列表和对话模板里。">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="名称">
                <Input
                  value={form.name}
                  maxLength={80}
                  placeholder="例如：深夜来信"
                  onChange={(event) => set("name", event.target.value)}
                />
              </Field>
              <Field label="从预设开始" hint="会覆盖当前排版参数">
                <Select value={form.builtInKey} onValueChange={applyPreset}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择内置预设" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_PRESETS.map((preset) => (
                      <SelectItem key={preset.key} value={preset.key}>
                        {preset.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="说明" hint="可选">
              <Textarea
                value={form.description}
                rows={2}
                placeholder="这套样式适合怎样的阅读体验？"
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
          </EditorSection>

          <EditorSection title="排版" description="调整对话在阅读区中的呈现方式。">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="布局">
                <Select
                  value={form.config.layout ?? "bubble"}
                  onValueChange={(value) =>
                    setConfig("layout", value as StyleConfig["layout"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LAYOUT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="最大宽度" hint={`${form.config.maxWidth ?? 860}px`}>
                <Input
                  type="range"
                  min={400}
                  max={1600}
                  step={20}
                  value={form.config.maxWidth ?? 860}
                  onChange={(event) =>
                    setConfig("maxWidth", Number(event.target.value))
                  }
                />
              </Field>
              <Field label="字号" hint={`${form.config.fontSize ?? 16}px`}>
                <Input
                  type="range"
                  min={12}
                  max={24}
                  step={1}
                  value={form.config.fontSize ?? 16}
                  onChange={(event) =>
                    setConfig("fontSize", Number(event.target.value))
                  }
                />
              </Field>
              <Field label="行高" hint={`${form.config.lineHeight ?? 1.8}`}>
                <Input
                  type="range"
                  min={1.2}
                  max={2.6}
                  step={0.1}
                  value={form.config.lineHeight ?? 1.8}
                  onChange={(event) =>
                    setConfig("lineHeight", Number(event.target.value))
                  }
                />
              </Field>
              <Field label="强调色" hint="十六进制颜色">
                <div className="flex items-center gap-2">
                  <span
                    className="size-9 shrink-0 rounded-lg border border-border/60"
                    style={{
                      background: form.config.accentColor || "#c9a45c",
                    }}
                  />
                  <Input
                    value={form.config.accentColor ?? ""}
                    placeholder="#c9a45c"
                    onChange={(event) =>
                      setConfig("accentColor", event.target.value)
                    }
                  />
                </div>
              </Field>
              <Field label="旁白颜色" hint="可选">
                <Input
                  value={form.config.narrationColor ?? ""}
                  placeholder="留空则使用默认文字色"
                  onChange={(event) =>
                    setConfig("narrationColor", event.target.value)
                  }
                />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {(
                [
                  ["showAvatars", "显示头像"],
                  ["showTimestamps", "显示时间"],
                  ["narrationQuotes", "引号渲染为旁白"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/25 px-3 py-2.5"
                >
                  <span className="text-xs">{label}</span>
                  <Switch
                    checked={Boolean(form.config[key])}
                    onCheckedChange={(checked) => setConfig(key, checked)}
                  />
                </label>
              ))}
            </div>
          </EditorSection>

          <EditorSection
            title="自定义 CSS"
            description="保存后会在渲染对话时净化并注入，仅作用于消息区域。"
          >
            <Field label="CSS" hint="可选">
              <Textarea
                value={form.customCss}
                rows={6}
                maxLength={50_000}
                className="font-mono text-[13px] leading-relaxed"
                placeholder={`.zy-bubble {\n  letter-spacing: 0.02em;\n}`}
                onChange={(event) => set("customCss", event.target.value)}
              />
            </Field>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              选择器会自动限定在对话内，可写{" "}
              <code>.zy-bubble</code>、<code>.zy-content</code>、
              <code>.zy-name</code>、<code>.zy-avatar</code>。包含{" "}
              <code>@import</code>、<code>url()</code> 或脚本的规则会被移除。
              下方预览会实时应用清洗后的 CSS。
            </p>
          </EditorSection>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <EditorSection
            title="实时预览"
            description="示例文字会随参数变化。"
            action={
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Check className="size-3 text-primary" />
                自动
              </span>
            }
          >
            <StylePreview
              config={form.config}
              customCss={form.customCss}
            />
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div className="rounded-lg bg-secondary/40 px-2.5 py-2">
                布局
                <span className="float-right text-foreground">
                  {
                    LAYOUT_OPTIONS.find(
                      (option) => option.value === (form.config.layout ?? "bubble"),
                    )?.label
                  }
                </span>
              </div>
              <div className="rounded-lg bg-secondary/40 px-2.5 py-2">
                字号
                <span className="float-right text-foreground">
                  {form.config.fontSize ?? 16}px
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg"
              onClick={() => applyPreset("tavern")}
            >
              <Wand2 data-icon="inline-start" />
              恢复暖金酒馆
            </Button>
          </EditorSection>
        </div>
      </div>
    </div>
  );
}
