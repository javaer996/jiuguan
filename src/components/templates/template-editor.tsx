"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Braces,
  Layers,
  Loader2,
  Palette,
  Save,
  ScrollText,
  Trash2,
  UserRound,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { StartChatButton } from "@/components/chat/start-chat-button";
import { Field } from "@/components/common/field";
import { EditorSection } from "@/components/common/editor-section";
import { ImageUpload } from "@/components/common/image-upload";
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
import { Checkbox } from "@/components/ui/checkbox";
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
import type {
  ChatTemplateDTO,
  TemplateOptions,
} from "@/lib/types/content";
import { cn } from "@/lib/utils";

const NONE = "none";

type TemplateForm = {
  name: string;
  description: string;
  coverUrl: string;
  characterId: string;
  worldbookIds: string[];
  promptPresetId: string;
  chatStyleId: string;
  themeId: string;
  outputSchemaId: string;
  personaId: string;
  providerId: string;
  greetingIndex: number;
  temperature: number;
  maxTokens: number;
  stream: boolean;
};

function toForm(template?: ChatTemplateDTO): TemplateForm {
  return {
    name: template?.name ?? "",
    description: template?.description ?? "",
    coverUrl: template?.coverUrl ?? "",
    characterId: template?.characterId ?? NONE,
    worldbookIds: template?.worldbookIds ?? [],
    promptPresetId: template?.promptPresetId ?? NONE,
    chatStyleId: template?.chatStyleId ?? NONE,
    themeId: template?.themeId ?? NONE,
    outputSchemaId: template?.outputSchemaId ?? NONE,
    personaId: template?.personaId ?? NONE,
    providerId: template?.providerId ?? NONE,
    greetingIndex: template?.greetingIndex ?? 0,
    temperature: template?.settings?.temperature ?? 0.85,
    maxTokens: template?.settings?.maxTokens ?? 2048,
    stream: template?.settings?.stream ?? true,
  };
}

function idOrNull(value: string) {
  return value === NONE ? null : value;
}

function RefSelect({
  label,
  hint,
  value,
  onChange,
  options,
  emptyLabel,
  icon: Icon,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  emptyLabel: string;
  icon: typeof BookOpen;
}) {
  return (
    <Field label={label} hint={hint}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <span className="flex min-w-0 items-center gap-2">
            <Icon className="size-3.5 shrink-0 text-muted-foreground" />
            <SelectValue placeholder={emptyLabel} />
          </span>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{emptyLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

export function TemplateEditor({
  initial,
  options,
}: {
  initial?: ChatTemplateDTO;
  options: TemplateOptions;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [form, setForm] = useState<TemplateForm>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const saveRef = useRef<() => void>(() => {});

  function set<K extends keyof TemplateForm>(
    key: K,
    value: TemplateForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function toggleWorldbook(id: string, checked: boolean) {
    setForm((previous) => ({
      ...previous,
      worldbookIds: checked
        ? [...previous.worldbookIds, id]
        : previous.worldbookIds.filter((item) => item !== id),
    }));
  }

  async function handleSave() {
    if (saving) return;
    if (!form.name.trim()) {
      toast.error("先给模板起一个名字");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        coverUrl: form.coverUrl.trim() || null,
        characterId: idOrNull(form.characterId),
        worldbookIds: form.worldbookIds,
        promptPresetId: idOrNull(form.promptPresetId),
        chatStyleId: idOrNull(form.chatStyleId),
        themeId: idOrNull(form.themeId),
        outputSchemaId: idOrNull(form.outputSchemaId),
        personaId: idOrNull(form.personaId),
        providerId: idOrNull(form.providerId),
        settings: {
          temperature: form.temperature,
          maxTokens: form.maxTokens,
          stream: form.stream,
        },
        greetingIndex: form.greetingIndex,
      };

      const result = await apiFetch<{ template: ChatTemplateDTO }>(
        isEdit ? `/api/templates/${initial!.id}` : "/api/templates",
        {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      toast.success(isEdit ? "对话模板已保存" : "对话模板已创建");
      if (!isEdit) {
        router.replace(`/templates/${result.template.id}`);
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
      await apiFetch(`/api/templates/${initial.id}`, { method: "DELETE" });
      toast.success("对话模板已删除");
      router.push("/templates");
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

  const selectedCharacter = options.characters.find(
    (item) => item.id === form.characterId,
  );

  return (
    <div className="min-h-dvh">
      <div className="sticky top-16 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl lg:top-0">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link href="/templates" aria-label="返回模板列表">
                <ArrowLeft />
              </Link>
            </Button>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                Chat template
              </p>
              <h1 className="truncate font-display text-lg font-medium">
                {isEdit ? form.name || "未命名模板" : "新建对话模板"}
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
                    aria-label="删除模板"
                  >
                    {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删除这个对话模板？</AlertDialogTitle>
                    <AlertDialogDescription>
                      模板只是一份组合配置，删除不会影响角色、世界书或已经开始的对话。
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
            {isEdit && initial && (
              <StartChatButton
                templateId={initial.id}
                variant="outline"
                size="sm"
                className="rounded-xl"
              >
                <span className="hidden sm:inline">开始对话</span>
              </StartChatButton>
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

      <div className="mx-auto grid w-full max-w-6xl gap-5 px-4 py-7 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-10 lg:py-10">
        <div className="space-y-5">
          <EditorSection title="模板信息" description="这一套情景叫什么，适合怎样的开场。">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="名称">
                <Input
                  value={form.name}
                  maxLength={80}
                  placeholder="例如：雨夜酒馆"
                  onChange={(event) => set("name", event.target.value)}
                />
              </Field>
              <Field label="封面图地址" hint="可选">
                <Input
                  value={form.coverUrl}
                  placeholder="https://… 或上传"
                  onChange={(event) => set("coverUrl", event.target.value)}
                />
              </Field>
            </div>
            <div className="mt-3">
              <ImageUpload
                value={form.coverUrl}
                onChange={(url) => set("coverUrl", url)}
                kind="background"
                shape="cover"
              />
            </div>
            <Field label="说明" hint="可选">
              <Textarea
                value={form.description}
                rows={3}
                placeholder="雨夜、炉火与一个不肯离开的旅人……"
                onChange={(event) => set("description", event.target.value)}
              />
            </Field>
          </EditorSection>

          <EditorSection
            title="角色与开场"
            description="角色决定语气与开场白，开场序号对应角色的备选问候语。"
          >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
              <RefSelect
                label="角色"
                icon={UserRound}
                emptyLabel="不绑定角色"
                value={form.characterId}
                onChange={(value) => set("characterId", value)}
                options={options.characters}
              />
              <Field label="开场序号" hint="0 = 主开场">
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={form.greetingIndex}
                  onChange={(event) =>
                    set("greetingIndex", Number(event.target.value) || 0)
                  }
                />
              </Field>
            </div>
          </EditorSection>

          <EditorSection
            title="世界书"
            description="对话开始时会一并挂载，按关键词激活条目。"
            action={
              <span className="text-[10px] text-muted-foreground">
                已选 {form.worldbookIds.length} 本
              </span>
            }
          >
            {options.worldbooks.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                还没有世界书，可以先去{" "}
                <Link href="/worldbooks" className="text-primary underline-offset-4 hover:underline">
                  世界书页面
                </Link>{" "}
                创建。
              </p>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {options.worldbooks.map((worldbook) => {
                  const checked = form.worldbookIds.includes(worldbook.id);
                  return (
                    <label
                      key={worldbook.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2.5 transition-colors",
                        checked
                          ? "border-primary/40 bg-primary/[0.06]"
                          : "border-border/60 bg-background/25 hover:bg-background/40",
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          toggleWorldbook(worldbook.id, value === true)
                        }
                      />
                      <BookOpen className="size-3.5 shrink-0 text-muted-foreground" />
                      <span className="truncate text-xs">{worldbook.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </EditorSection>

          <EditorSection
            title="提示词、样式与格式"
            description="把预设组合起来，一键进入完整的情景。"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <RefSelect
                label="提示词预设"
                icon={ScrollText}
                emptyLabel="使用默认提示词"
                value={form.promptPresetId}
                onChange={(value) => set("promptPresetId", value)}
                options={options.prompts}
              />
              <RefSelect
                label="对话样式"
                icon={Palette}
                emptyLabel="使用默认样式"
                value={form.chatStyleId}
                onChange={(value) => set("chatStyleId", value)}
                options={options.styles}
              />
              <RefSelect
                label="输出格式"
                icon={Braces}
                emptyLabel="纯文本回复"
                value={form.outputSchemaId}
                onChange={(value) => set("outputSchemaId", value)}
                options={options.schemas}
              />
              <RefSelect
                label="用户身份"
                icon={UserRound}
                emptyLabel="使用默认身份"
                value={form.personaId}
                onChange={(value) => set("personaId", value)}
                options={options.personas}
              />
              <RefSelect
                label="主题"
                icon={Layers}
                emptyLabel="跟随全局主题"
                value={form.themeId}
                onChange={(value) => set("themeId", value)}
                options={options.themes}
              />
              <RefSelect
                label="API 供应商"
                icon={Wand2}
                emptyLabel="使用默认供应商"
                value={form.providerId}
                onChange={(value) => set("providerId", value)}
                options={options.providers}
              />
            </div>
          </EditorSection>

          <EditorSection
            title="生成参数"
            description="这些参数会作为新对话的初始设置，之后仍可在对话里调整。"
          >
            <div className="grid gap-4 sm:grid-cols-3">
              <Field
                label="温度"
                hint={`${form.temperature.toFixed(2)}`}
              >
                <Input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={form.temperature}
                  onChange={(event) =>
                    set("temperature", Number(event.target.value))
                  }
                />
              </Field>
              <Field label="最大回复 Token">
                <Input
                  type="number"
                  min={64}
                  max={32768}
                  step={64}
                  value={form.maxTokens}
                  onChange={(event) =>
                    set("maxTokens", Number(event.target.value) || 2048)
                  }
                />
              </Field>
              <label className="flex cursor-pointer items-center justify-between gap-3 self-end rounded-xl border border-border/60 bg-background/25 px-3 py-2.5">
                <span className="text-xs">流式输出</span>
                <Switch
                  checked={form.stream}
                  onCheckedChange={(checked) => set("stream", checked)}
                />
              </label>
            </div>
          </EditorSection>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <EditorSection title="组合预览" description="保存后即可在对话中一键启用。">
            <div className="rounded-xl border border-border/60 bg-background/30 p-4">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-primary/12 font-display text-base text-primary">
                  {selectedCharacter?.name.slice(0, 1) ?? "情"}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-display text-base">
                    {form.name || "未命名模板"}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {selectedCharacter?.name ?? "未绑定角色"}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-[11px] text-muted-foreground">
                <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-2.5 py-1.5">
                  <span>世界书</span>
                  <span className="text-foreground">
                    {form.worldbookIds.length} 本
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-2.5 py-1.5">
                  <span>提示词</span>
                  <span className="max-w-[60%] truncate text-foreground">
                    {options.prompts.find(
                      (item) => item.id === form.promptPresetId,
                    )?.name ?? "默认"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-2.5 py-1.5">
                  <span>样式</span>
                  <span className="max-w-[60%] truncate text-foreground">
                    {options.styles.find((item) => item.id === form.chatStyleId)
                      ?.name ?? "默认"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-2.5 py-1.5">
                  <span>输出格式</span>
                  <span className="max-w-[60%] truncate text-foreground">
                    {options.schemas.find(
                      (item) => item.id === form.outputSchemaId,
                    )?.name ?? "纯文本"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-2.5 py-1.5">
                  <span>温度</span>
                  <span className="text-foreground">
                    {form.temperature.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              模板只保存引用与参数；被引用的资源删除后，对应槽位会自动回落到默认设置。
            </p>
          </EditorSection>
        </div>
      </div>
    </div>
  );
}
