"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Loader2,
  Plus,
  Save,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { EditorSection } from "@/components/common/editor-section";
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
import { Label } from "@/components/ui/label";
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
import { defaultPromptBlocks } from "@/lib/content/defaults";
import type { PromptBlock } from "@/db/schema/types";
import type { PromptPresetDTO } from "@/lib/types/content";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "system", label: "系统" },
  { value: "user", label: "用户" },
  { value: "assistant", label: "角色" },
] as const;

const POSITION_OPTIONS = [
  { value: "main", label: "主提示词" },
  { value: "pre_history", label: "历史之前" },
  { value: "post_history", label: "历史之后" },
  { value: "depth", label: "按深度注入" },
] as const;

const MARKER_OPTIONS = [
  { value: "none", label: "普通文本" },
  { value: "char", label: "角色设定" },
  { value: "user", label: "用户设定" },
  { value: "persona", label: "用户身份" },
  { value: "worldbook", label: "世界书" },
  { value: "chat_history", label: "对话历史" },
  { value: "author_note", label: "作者注" },
] as const;

type VariablePair = { key: string; value: string };

type PromptForm = {
  name: string;
  description: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  blocks: PromptBlock[];
  variables: VariablePair[];
  isDefault: boolean;
};

function toForm(preset?: PromptPresetDTO): PromptForm {
  return {
    name: preset?.name ?? "",
    description: preset?.description ?? "",
    systemPrompt: preset?.systemPrompt ?? "",
    postHistoryInstructions: preset?.postHistoryInstructions ?? "",
    blocks: preset?.blocks ?? [],
    variables: Object.entries(preset?.variables ?? {}).map(([key, value]) => ({
      key,
      value,
    })),
    isDefault: preset?.isDefault ?? false,
  };
}

function newBlock(): PromptBlock {
  return {
    id: `block-${Date.now().toString(36)}`,
    name: "新的提示词块",
    role: "system",
    content: "",
    enabled: true,
    position: "main",
  };
}

export function PromptEditor({ initial }: { initial?: PromptPresetDTO }) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [form, setForm] = useState<PromptForm>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openBlock, setOpenBlock] = useState<string | null>(null);
  const saveRef = useRef<() => void>(() => {});

  function set<K extends keyof PromptForm>(key: K, value: PromptForm[K]) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  function updateBlock(id: string, patch: Partial<PromptBlock>) {
    setForm((previous) => ({
      ...previous,
      blocks: previous.blocks.map((block) =>
        block.id === id ? { ...block, ...patch } : block,
      ),
    }));
  }

  function removeBlock(id: string) {
    setForm((previous) => ({
      ...previous,
      blocks: previous.blocks.filter((block) => block.id !== id),
    }));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    setForm((previous) => {
      const target = index + direction;
      if (target < 0 || target >= previous.blocks.length) return previous;
      const blocks = [...previous.blocks];
      [blocks[index], blocks[target]] = [blocks[target]!, blocks[index]!];
      return { ...previous, blocks };
    });
  }

  async function handleSave() {
    if (saving) return;
    if (!form.name.trim()) {
      toast.error("先给提示词预设起一个名字");
      return;
    }

    setSaving(true);
    try {
      const variables = form.variables.reduce<Record<string, string>>(
        (result, pair) => {
          const key = pair.key.trim();
          if (key) result[key] = pair.value;
          return result;
        },
        {},
      );

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        systemPrompt: form.systemPrompt || null,
        postHistoryInstructions: form.postHistoryInstructions || null,
        blocks: form.blocks.map((block) => ({
          ...block,
          content: block.marker ? "" : block.content,
        })),
        variables,
        isDefault: form.isDefault,
      };

      const result = await apiFetch<{ preset: PromptPresetDTO }>(
        isEdit ? `/api/prompts/${initial!.id}` : "/api/prompts",
        {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      toast.success(isEdit ? "提示词已保存" : "提示词预设已创建");
      if (!isEdit) {
        router.replace(`/prompts/${result.preset.id}`);
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
      await apiFetch(`/api/prompts/${initial.id}`, { method: "DELETE" });
      toast.success("提示词预设已删除");
      router.push("/prompts");
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
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="ghost" size="icon" className="rounded-xl">
              <Link href="/prompts" aria-label="返回提示词列表">
                <ArrowLeft />
              </Link>
            </Button>
            <div className="min-w-0">
              <p className="text-[10px] tracking-[0.22em] text-muted-foreground uppercase">
                Prompt preset
              </p>
              <h1 className="truncate font-display text-lg font-medium">
                {isEdit ? form.name || "未命名预设" : "新建提示词预设"}
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
                    aria-label="删除预设"
                  >
                    {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删除这套提示词？</AlertDialogTitle>
                    <AlertDialogDescription>
                      使用它的模板会失去引用，但已经开始的对话不受影响。
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

      <div className="mx-auto grid w-full max-w-5xl gap-5 px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
        <EditorSection title="预设信息" description="给这套提示词一个名字，并决定它是否成为默认。">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="名称" htmlFor="preset-name">
              <Input
                id="preset-name"
                value={form.name}
                maxLength={80}
                placeholder="例如：慢热叙事"
                onChange={(event) => set("name", event.target.value)}
              />
            </Field>
            <div className="flex items-end justify-between gap-4 rounded-xl border border-border/60 bg-background/30 px-4 py-3">
              <div>
                <Label htmlFor="preset-default">设为默认</Label>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  新对话会自动带上这套提示词
                </p>
              </div>
              <Switch
                id="preset-default"
                checked={form.isDefault}
                onCheckedChange={(checked) => set("isDefault", checked)}
              />
            </div>
          </div>
          <Field label="说明" hint="可选">
            <Textarea
              value={form.description}
              rows={2}
              maxLength={20_000}
              placeholder="这套提示词适合怎样的故事？"
              onChange={(event) => set("description", event.target.value)}
            />
          </Field>
        </EditorSection>

        <EditorSection title="核心提示词" description="系统提示词在对话开头注入，历史后指令紧跟在消息历史之后。">
          <Field
            label="系统提示词"
            hint="支持 {{char}} / {{user}} 变量"
          >
            <Textarea
              value={form.systemPrompt}
              rows={5}
              maxLength={50_000}
              className="font-mono text-[13px] leading-relaxed"
              placeholder="你正在扮演{{char}}……"
              onChange={(event) => set("systemPrompt", event.target.value)}
            />
          </Field>
          <Field label="历史后指令" hint="可选">
            <Textarea
              value={form.postHistoryInstructions}
              rows={3}
              maxLength={50_000}
              className="font-mono text-[13px] leading-relaxed"
              placeholder="保持回复自然、有画面感……"
              onChange={(event) =>
                set("postHistoryInstructions", event.target.value)
              }
            />
          </Field>
        </EditorSection>

        <EditorSection
          title="提示词块"
          description="按顺序拼装提示词。标记块会在运行时替换为对应内容，无需填写正文。"
          action={
            <div className="flex gap-2">
              {form.blocks.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => set("blocks", defaultPromptBlocks())}
                >
                  <Wand2 data-icon="inline-start" />
                  内置块
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  const block = newBlock();
                  set("blocks", [...form.blocks, block]);
                  setOpenBlock(block.id);
                }}
              >
                <Plus data-icon="inline-start" />
                添加块
              </Button>
            </div>
          }
        >
          {form.blocks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
              还没有提示词块。可以插入内置块组，或从空白块开始。
            </div>
          ) : (
            <div className="space-y-3">
              {form.blocks.map((block, index) => {
                const expanded = openBlock === block.id;
                return (
                  <div
                    key={block.id}
                    className={cn(
                      "overflow-hidden rounded-xl border bg-background/25 transition-colors",
                      block.enabled
                        ? "border-border/60"
                        : "border-border/40 opacity-60",
                    )}
                  >
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        onClick={() =>
                          setOpenBlock(expanded ? null : block.id)
                        }
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 shrink-0 text-muted-foreground transition-transform",
                            expanded && "rotate-180",
                          )}
                        />
                        <span className="truncate text-sm font-medium">
                          {block.name || "未命名块"}
                        </span>
                        <span className="shrink-0 rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {
                            POSITION_OPTIONS.find(
                              (item) => item.value === block.position,
                            )?.label
                          }
                        </span>
                        {block.marker && (
                          <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                            动态
                          </span>
                        )}
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-md text-muted-foreground"
                          onClick={() => moveBlock(index, -1)}
                          disabled={index === 0}
                          aria-label="上移"
                        >
                          <ChevronDown className="size-3.5 rotate-180" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-md text-muted-foreground"
                          onClick={() => moveBlock(index, 1)}
                          disabled={index === form.blocks.length - 1}
                          aria-label="下移"
                        >
                          <ChevronDown className="size-3.5" />
                        </Button>
                        <Switch
                          checked={block.enabled}
                          onCheckedChange={(checked) =>
                            updateBlock(block.id, { enabled: checked })
                          }
                          aria-label="启用"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-md text-muted-foreground hover:text-destructive"
                          onClick={() => removeBlock(block.id)}
                          aria-label="删除块"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>

                    {expanded && (
                      <div className="space-y-3 border-t border-border/50 px-3 py-3">
                        <div className="grid gap-3 sm:grid-cols-3">
                          <Field label="块名称">
                            <Input
                              value={block.name}
                              maxLength={80}
                              onChange={(event) =>
                                updateBlock(block.id, {
                                  name: event.target.value,
                                })
                              }
                            />
                          </Field>
                          <Field label="角色">
                            <Select
                              value={block.role}
                              onValueChange={(value) =>
                                updateBlock(block.id, {
                                  role: value as PromptBlock["role"],
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ROLE_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          <Field label="位置">
                            <Select
                              value={block.position}
                              onValueChange={(value) =>
                                updateBlock(block.id, {
                                  position: value as PromptBlock["position"],
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {POSITION_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <Field label="动态内容" hint="标记块会自动填充">
                            <Select
                              value={block.marker ?? "none"}
                              onValueChange={(value) =>
                                updateBlock(block.id, {
                                  marker:
                                    value === "none"
                                      ? undefined
                                      : (value as PromptBlock["marker"]),
                                })
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {MARKER_OPTIONS.map((option) => (
                                  <SelectItem
                                    key={option.value}
                                    value={option.value}
                                  >
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </Field>
                          {block.position === "depth" && (
                            <Field label="注入深度">
                              <Input
                                type="number"
                                min={0}
                                max={100}
                                value={block.depth ?? 0}
                                onChange={(event) =>
                                  updateBlock(block.id, {
                                    depth: Number(event.target.value),
                                  })
                                }
                              />
                            </Field>
                          )}
                        </div>

                        {block.marker ? (
                          <p className="rounded-lg bg-primary/[0.06] px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
                            这是一个动态块，内容会在生成提示词时由系统自动填充。
                          </p>
                        ) : (
                          <Field label="内容" hint="支持 {{char}} / {{user}} 变量">
                            <Textarea
                              value={block.content}
                              rows={4}
                              maxLength={50_000}
                              className="font-mono text-[13px] leading-relaxed"
                              placeholder="写下这个块要注入的内容…"
                              onChange={(event) =>
                                updateBlock(block.id, {
                                  content: event.target.value,
                                })
                              }
                            />
                          </Field>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </EditorSection>

        <EditorSection
          title="变量"
          description="在提示词中用 {{变量名}} 引用，保存时会一并写入预设。"
          action={
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() =>
                set("variables", [...form.variables, { key: "", value: "" }])
              }
            >
              <Plus data-icon="inline-start" />
              添加变量
            </Button>
          }
        >
          {form.variables.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              暂无变量。角色、用户等内置变量无需在这里声明。
            </p>
          ) : (
            <div className="space-y-2">
              {form.variables.map((pair, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={pair.key}
                    placeholder="变量名"
                    className="max-w-44 font-mono text-xs"
                    onChange={(event) => {
                      const variables = [...form.variables];
                      variables[index] = { ...pair, key: event.target.value };
                      set("variables", variables);
                    }}
                  />
                  <Input
                    value={pair.value}
                    placeholder="变量值"
                    className="flex-1"
                    onChange={(event) => {
                      const variables = [...form.variables];
                      variables[index] = { ...pair, value: event.target.value };
                      set("variables", variables);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-lg text-muted-foreground hover:text-destructive"
                    onClick={() =>
                      set(
                        "variables",
                        form.variables.filter((_, i) => i !== index),
                      )
                    }
                    aria-label="删除变量"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </EditorSection>
      </div>
    </div>
  );
}
