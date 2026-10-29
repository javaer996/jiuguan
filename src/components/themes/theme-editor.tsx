"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  Palette,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { EditorSection } from "@/components/common/editor-section";
import { Field } from "@/components/common/field";
import { ImageUpload } from "@/components/common/image-upload";
import { ThemePreview } from "@/components/themes/theme-preview";
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
import { THEME_PRESETS, themePreset } from "@/lib/theme/presets";
import { THEME_TOKENS } from "@/lib/theme/tokens";
import type { ThemeDTO } from "@/lib/types/content";
import { cn } from "@/lib/utils";

type ThemeForm = {
  name: string;
  description: string;
  presetKey: string;
  tokens: Record<string, string>;
  customCss: string;
  backgroundUrl: string;
  mode: "dark" | "light" | "both";
  isDefault: boolean;
};

const MODE_OPTIONS = [
  { value: "dark", label: "深色" },
  { value: "light", label: "浅色" },
  { value: "both", label: "通用" },
] as const;

function detectPresetKey(tokens?: Record<string, string> | null) {
  if (!tokens) return THEME_PRESETS[0]!.key;

  // 自定义主题通常只改动了少数变量，按匹配度找最接近的预设，
  // 避免一改主色就错误地显示成第一个预设。
  let bestKey = THEME_PRESETS[0]!.key;
  let bestScore = -1;
  for (const preset of THEME_PRESETS) {
    const score = Object.entries(preset.tokens).reduce(
      (total, [key, value]) =>
        total + ((tokens[key] ?? preset.tokens[key]) === value ? 1 : 0),
      0,
    );
    if (score > bestScore) {
      bestKey = preset.key;
      bestScore = score;
    }
  }
  return bestKey;
}

function toForm(theme?: ThemeDTO): ThemeForm {
  const presetKey = detectPresetKey(theme?.tokens);
  const preset = themePreset(presetKey);
  return {
    name: theme?.name ?? "",
    description: theme?.description ?? "",
    presetKey,
    tokens: { ...preset.tokens, ...(theme?.tokens ?? {}) },
    customCss: theme?.customCss ?? "",
    backgroundUrl: theme?.backgroundUrl ?? "",
    mode: theme?.mode ?? "both",
    isDefault: theme?.isDefault ?? false,
  };
}

function hexForPicker(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
}

export function ThemeEditor({ initial }: { initial?: ThemeDTO }) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [form, setForm] = useState<ThemeForm>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const saveRef = useRef<() => void>(() => {});

  function set<K extends keyof ThemeForm>(key: K, value: ThemeForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function setToken(key: string, value: string) {
    setForm((previous) => ({
      ...previous,
      tokens: { ...previous.tokens, [key]: value },
    }));
  }

  function applyPreset(key: string) {
    const preset = THEME_PRESETS.find((item) => item.key === key);
    if (!preset) return;
    setForm((previous) => ({
      ...previous,
      presetKey: preset.key,
      name: previous.name || preset.name,
      description: previous.description || preset.description,
      tokens: { ...preset.tokens },
      mode: preset.mode,
    }));
    toast.success(`已应用「${preset.name}」预设`);
  }

  async function handleSave() {
    if (saving) return;
    if (!form.name.trim()) {
      toast.error("先给主题起一个名字");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        tokens: form.tokens,
        customCss: form.customCss || null,
        backgroundUrl: form.backgroundUrl.trim() || null,
        mode: form.mode,
        isDefault: form.isDefault,
      };

      const result = await apiFetch<{ theme: ThemeDTO }>(
        isEdit ? `/api/themes/${initial!.id}` : "/api/themes",
        {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      toast.success(isEdit ? "主题已保存" : "主题已创建");
      if (!isEdit) {
        router.replace(`/themes/${result.theme.id}`);
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
      await apiFetch(`/api/themes/${initial.id}`, { method: "DELETE" });
      toast.success("主题已删除");
      router.push("/themes");
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

  const groups = ["基础", "强调", "层次", "排版"] as const;

  return (
    <div className="min-h-dvh">
      <div className="sticky top-16 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl lg:top-0">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link href="/themes" aria-label="返回主题列表">
                <ArrowLeft />
              </Link>
            </Button>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                Chat theme
              </p>
              <h1 className="truncate font-display text-lg font-medium">
                {isEdit ? form.name || "未命名主题" : "新建主题"}
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
                    aria-label="删除主题"
                  >
                    {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删除这个主题？</AlertDialogTitle>
                    <AlertDialogDescription>
                      引用它的模板会失去主题，正在使用它的对话会恢复默认外观。
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

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:px-10 lg:py-10">
        <div className="space-y-5">
          <EditorSection
            title="主题信息"
            description="主题会改变聊天页的背景、文字与强调色，不改变全局界面。"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="名称">
                <Input
                  value={form.name}
                  maxLength={80}
                  placeholder="例如：雾港青灯"
                  onChange={(event) => set("name", event.target.value)}
                />
              </Field>
              <Field label="从预设开始" hint="会覆盖当前色板">
                <Select value={form.presetKey} onValueChange={applyPreset}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="选择内置预设" />
                  </SelectTrigger>
                  <SelectContent>
                    {THEME_PRESETS.map((preset) => (
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
                placeholder="这个主题适合怎样的故事氛围？"
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="明暗模式" hint="仅作标记">
                <Select
                  value={form.mode}
                  onValueChange={(value) =>
                    set("mode", value as ThemeForm["mode"])
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MODE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <label className="flex cursor-pointer items-center justify-between gap-3 self-end rounded-xl border border-border/60 bg-background/25 px-3 py-2.5">
                <span className="text-xs">
                  设为默认主题
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    新对话会优先使用它
                  </span>
                </span>
                <Switch
                  checked={form.isDefault}
                  onCheckedChange={(checked) => set("isDefault", checked)}
                />
              </label>
            </div>
          </EditorSection>

          <EditorSection
            title="色板"
            description="这些变量只在聊天页内生效，可以随时微调。"
            action={
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg text-[11px] text-muted-foreground"
                onClick={() => applyPreset(form.presetKey)}
              >
                <Wand2 data-icon="inline-start" />
                重置色板
              </Button>
            }
          >
            <div className="space-y-5">
              {groups.map((group) => {
                const tokens = THEME_TOKENS.filter(
                  (token) => token.group === group,
                );
                if (tokens.length === 0) return null;
                return (
                  <div key={group}>
                    <p className="mb-2 text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                      {group}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {tokens.map((token) => {
                        const value = form.tokens[token.key] ?? "";
                        return (
                          <Field
                            key={token.key}
                            label={token.label}
                            hint={token.hint}
                          >
                            <div className="flex items-center gap-2">
                              {token.kind === "color" && (
                                <input
                                  type="color"
                                  value={hexForPicker(value)}
                                  onChange={(event) =>
                                    setToken(token.key, event.target.value)
                                  }
                                  className="size-9 shrink-0 cursor-pointer rounded-lg border border-border/60 bg-transparent p-0.5"
                                  aria-label={`${token.label}取色`}
                                />
                              )}
                              <Input
                                value={value}
                                maxLength={200}
                                className={cn(
                                  token.kind === "font" && "font-mono text-xs",
                                )}
                                onChange={(event) =>
                                  setToken(token.key, event.target.value)
                                }
                              />
                            </div>
                          </Field>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </EditorSection>

          <EditorSection
            title="背景与自定义 CSS"
            description="背景图会覆盖在主题底色之上；CSS 保存前会被净化并限定在聊天区域内。"
          >
            <Field label="背景图" hint="上传或粘贴 http(s) 图片地址">
              <ImageUpload
                value={form.backgroundUrl}
                onChange={(url) => set("backgroundUrl", url)}
                kind="background"
                shape="cover"
              />
            </Field>
            <Field label="背景图地址">
              <Input
                value={form.backgroundUrl}
                placeholder="/uploads/... 或 https://..."
                onChange={(event) =>
                  set("backgroundUrl", event.target.value)
                }
              />
            </Field>
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
              选择器会自动限定在 <code>.zy-chat</code> 内，可写{" "}
              <code>.zy-bubble</code>、<code>.zy-content</code>、
              <code>.zy-name</code>、<code>.zy-avatar</code>。包含{" "}
              <code>@import</code>、<code>url()</code> 或脚本的规则会被移除。
            </p>
          </EditorSection>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <EditorSection
            title="实时预览"
            description="示例对话会立即应用当前主题。"
            action={
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Check className="size-3 text-primary" />
                自动
              </span>
            }
          >
            <ThemePreview
              tokens={form.tokens}
              backgroundUrl={form.backgroundUrl}
              customCss={form.customCss}
              title={form.name || "未命名主题"}
              subtitle={`${themePreset(form.presetKey).name} · ${form.mode}`}
            />
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div className="rounded-lg bg-secondary/40 px-2.5 py-2">
                主色
                <span className="float-right flex items-center gap-1.5 text-foreground">
                  <span
                    className="size-3 rounded-full border border-border/60"
                    style={{ background: form.tokens["--primary"] }}
                  />
                  {form.tokens["--primary"] ?? "默认"}
                </span>
              </div>
              <div className="rounded-lg bg-secondary/40 px-2.5 py-2">
                圆角
                <span className="float-right text-foreground">
                  {form.tokens["--radius"] ?? "默认"}
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full rounded-lg"
              onClick={() => applyPreset("warm-gold")}
            >
              <Palette data-icon="inline-start" />
              恢复暖金酒馆
            </Button>
          </EditorSection>
        </div>
      </div>
    </div>
  );
}
