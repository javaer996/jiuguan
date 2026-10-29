"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Loader2,
  Plus,
  Save,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import { StartChatButton } from "@/components/chat/start-chat-button";
import { EditorSection } from "@/components/common/editor-section";
import { ImageUpload } from "@/components/common/image-upload";
import { TagInput } from "@/components/common/tag-input";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type { CharacterDTO } from "@/lib/types/content";
import { initials } from "@/lib/utils";

type CharacterForm = {
  name: string;
  avatarUrl: string;
  tagline: string;
  description: string;
  personality: string;
  scenario: string;
  firstMessage: string;
  alternateGreetings: string[];
  exampleDialogue: string;
  systemPrompt: string;
  postHistoryInstructions: string;
  creatorNotes: string;
  tags: string[];
};

function toForm(character?: CharacterDTO): CharacterForm {
  return {
    name: character?.name ?? "",
    avatarUrl: character?.avatarUrl ?? "",
    tagline: character?.tagline ?? "",
    description: character?.description ?? "",
    personality: character?.personality ?? "",
    scenario: character?.scenario ?? "",
    firstMessage: character?.firstMessage ?? "",
    alternateGreetings: character?.alternateGreetings ?? [],
    exampleDialogue: character?.exampleDialogue ?? "",
    systemPrompt: character?.systemPrompt ?? "",
    postHistoryInstructions: character?.postHistoryInstructions ?? "",
    creatorNotes: character?.creatorNotes ?? "",
    tags: character?.tags ?? [],
  };
}

function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={htmlFor}>{label}</Label>
        {hint && (
          <span className="text-[11px] text-muted-foreground">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

export function CharacterEditor({
  initial,
}: {
  initial?: CharacterDTO;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial);
  const [form, setForm] = useState<CharacterForm>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const saveRef = useRef<() => void>(() => {});

  function set<K extends keyof CharacterForm>(
    key: K,
    value: CharacterForm[K],
  ) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSave() {
    if (saving) return;
    if (!form.name.trim()) {
      toast.error("先给角色起一个名字");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        avatarUrl: form.avatarUrl.trim() || null,
        tagline: form.tagline.trim() || null,
        description: form.description || null,
        personality: form.personality || null,
        scenario: form.scenario || null,
        firstMessage: form.firstMessage || null,
        alternateGreetings: form.alternateGreetings
          .map((item) => item.trim())
          .filter(Boolean),
        exampleDialogue: form.exampleDialogue || null,
        systemPrompt: form.systemPrompt || null,
        postHistoryInstructions: form.postHistoryInstructions || null,
        creatorNotes: form.creatorNotes || null,
        tags: form.tags,
        source: initial?.source ?? "manual",
      };

      const result = await apiFetch<{ character: CharacterDTO }>(
        isEdit ? `/api/characters/${initial!.id}` : "/api/characters",
        {
          method: isEdit ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        },
      );

      toast.success(isEdit ? "角色已保存" : "角色已入住酒馆");
      if (!isEdit) {
        router.replace(`/characters/${result.character.id}`);
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
      await apiFetch(`/api/characters/${initial.id}`, { method: "DELETE" });
      toast.success("角色已离开酒馆");
      router.push("/characters");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "删除失败",
      );
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
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-10">
          <Button variant="ghost" size="icon" asChild className="rounded-xl">
            <Link href="/characters" aria-label="返回角色列表">
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.26em] text-muted-foreground uppercase">
              Character studio
            </p>
            <h1 className="truncate font-display text-lg font-medium">
              {isEdit ? form.name || "未命名角色" : "新建角色"}
            </h1>
          </div>
          <span className="hidden text-[11px] text-muted-foreground sm:block">
            ⌘S 保存
          </span>
          {isEdit && initial && (
            <Button variant="outline" size="sm" asChild className="rounded-xl">
              <a
                href={`/api/characters/${initial.id}/export`}
                download
                aria-label="导出角色卡"
              >
                <Download data-icon="inline-start" />
                <span className="hidden sm:inline">导出</span>
              </a>
            </Button>
          )}
          {isEdit && initial && (
            <StartChatButton
              characterId={initial.id}
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
              <Loader2 className="animate-spin" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {saving ? "保存中…" : "保存"}
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-5">
            <EditorSection
              title="基础档案"
              description="角色留给世界的第一印象。"
            >
              <Field label="角色名" htmlFor="name" hint="必填">
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => set("name", event.target.value)}
                  placeholder="例如：月见"
                  maxLength={64}
                  className="h-10 rounded-xl bg-background/50"
                />
              </Field>

              <Field
                label="一句话简介"
                htmlFor="tagline"
                hint="会显示在角色卡上"
              >
                <Input
                  id="tagline"
                  value={form.tagline}
                  onChange={(event) => set("tagline", event.target.value)}
                  placeholder="雨夜书店的常客，慢热，喜欢旧诗"
                  maxLength={160}
                  className="h-10 rounded-xl bg-background/50"
                />
              </Field>

              <Field
                label="角色描述"
                htmlFor="description"
                hint={`${form.description.length} 字`}
              >
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(event) => set("description", event.target.value)}
                  placeholder="外貌、身份、经历、说话方式……写下 AI 需要知道的一切。"
                  className="min-h-40 rounded-xl bg-background/50 leading-relaxed"
                />
              </Field>
            </EditorSection>

            <EditorSection
              title="人格与场景"
              description="决定角色如何思考，以及故事从何处开始。"
            >
              <Field label="性格" htmlFor="personality">
                <Textarea
                  id="personality"
                  value={form.personality}
                  onChange={(event) => set("personality", event.target.value)}
                  placeholder="温柔但不轻易交心；习惯用书页和雨声掩饰情绪。"
                  className="min-h-28 rounded-xl bg-background/50 leading-relaxed"
                />
              </Field>

              <Field label="场景" htmlFor="scenario">
                <Textarea
                  id="scenario"
                  value={form.scenario}
                  onChange={(event) => set("scenario", event.target.value)}
                  placeholder="一间开在旧街尽头的书店，只在雨夜营业。"
                  className="min-h-28 rounded-xl bg-background/50 leading-relaxed"
                />
              </Field>
            </EditorSection>

            <EditorSection
              title="开场白"
              description="角色说的第一句话，也是故事的第一盏灯。"
              action={
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() =>
                    set("alternateGreetings", [
                      ...form.alternateGreetings,
                      "",
                    ])
                  }
                >
                  <Plus data-icon="inline-start" />
                  添加开场白
                </Button>
              }
            >
              <Field label="主开场白" htmlFor="firstMessage">
                <Textarea
                  id="firstMessage"
                  value={form.firstMessage}
                  onChange={(event) => set("firstMessage", event.target.value)}
                  placeholder="“今晚的雨，像有人在窗外一页一页地翻书。”"
                  className="min-h-32 rounded-xl bg-background/50 leading-relaxed"
                />
              </Field>

              {form.alternateGreetings.map((greeting, index) => (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>备用开场白 {index + 1}</Label>
                    <button
                      type="button"
                      onClick={() =>
                        set(
                          "alternateGreetings",
                          form.alternateGreetings.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        )
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                      移除
                    </button>
                  </div>
                  <Textarea
                    value={greeting}
                    onChange={(event) => {
                      const next = [...form.alternateGreetings];
                      next[index] = event.target.value;
                      set("alternateGreetings", next);
                    }}
                    placeholder="另一种相遇的方式…"
                    className="min-h-24 rounded-xl bg-background/50 leading-relaxed"
                  />
                </div>
              ))}
            </EditorSection>

            <EditorSection
              title="对话示例"
              description="用几轮示例对话，教会角色自己的语气与节奏。"
            >
              <Textarea
                id="exampleDialogue"
                value={form.exampleDialogue}
                onChange={(event) =>
                  set("exampleDialogue", event.target.value)
                }
                placeholder={"{{user}}: 这里还营业吗？\n{{char}}: 雨停之前，都算营业。"}
                className="min-h-44 rounded-xl bg-background/50 font-mono text-[13px] leading-relaxed"
              />
            </EditorSection>

            <EditorSection
              title="高级提示"
              description="可选。用于覆盖全局提示词，或追加历史之后的指令。"
            >
              <Field label="角色系统提示" htmlFor="systemPrompt">
                <Textarea
                  id="systemPrompt"
                  value={form.systemPrompt}
                  onChange={(event) => set("systemPrompt", event.target.value)}
                  placeholder="始终以第一人称扮演月见，不要跳出角色。"
                  className="min-h-28 rounded-xl bg-background/50 leading-relaxed"
                />
              </Field>

              <Field
                label="历史后指令"
                htmlFor="postHistoryInstructions"
              >
                <Textarea
                  id="postHistoryInstructions"
                  value={form.postHistoryInstructions}
                  onChange={(event) =>
                    set("postHistoryInstructions", event.target.value)
                  }
                  placeholder="在回复末尾保持留白，给用户接话的空间。"
                  className="min-h-28 rounded-xl bg-background/50 leading-relaxed"
                />
              </Field>
            </EditorSection>

            <EditorSection
              title="作者备注"
              description="只给你自己看，不会发送给 AI。"
            >
              <Textarea
                id="creatorNotes"
                value={form.creatorNotes}
                onChange={(event) => set("creatorNotes", event.target.value)}
                placeholder="灵感来源、待调整的地方、想尝试的剧情……"
                className="min-h-24 rounded-xl bg-background/50 leading-relaxed"
              />
            </EditorSection>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
              <div className="flex flex-col items-center text-center">
                <Avatar className="size-24 rounded-3xl">
                  {form.avatarUrl && (
                    <AvatarImage src={form.avatarUrl} alt="" />
                  )}
                  <AvatarFallback className="rounded-3xl bg-primary/12 font-display text-3xl text-primary">
                    {form.name ? initials(form.name) : (
                      <UserRound className="size-8" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-3 text-sm font-medium">
                  {form.name || "未命名角色"}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {form.tagline || "还没有写下简介"}
                </p>
              </div>

              <div className="mt-5 space-y-2">
                <Label className="text-xs">头像</Label>
                <ImageUpload
                  value={form.avatarUrl}
                  onChange={(url) => set("avatarUrl", url)}
                  kind="avatar"
                  shape="avatar"
                />
                <Input
                  id="avatarUrl"
                  value={form.avatarUrl}
                  onChange={(event) => set("avatarUrl", event.target.value)}
                  placeholder="也可以粘贴图片直链 https://…"
                  className="h-9 rounded-xl bg-background/50 text-xs"
                  aria-label="头像地址"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
              <Label className="text-xs">标签</Label>
              <div className="mt-2">
                <TagInput
                  value={form.tags}
                  onChange={(tags) => set("tags", tags)}
                  placeholder="古风、慢热、治愈…"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/30 p-5">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" />
                保存后即可在对话模板与广场中使用
              </div>
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
                className="mt-4 h-10 w-full rounded-xl shadow-glow"
              >
                {saving ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                {saving ? "保存中…" : "保存角色"}
              </Button>

              {isEdit && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      className="mt-2 h-9 w-full rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 data-icon="inline-start" />
                      删除角色
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>让角色离开酒馆？</AlertDialogTitle>
                      <AlertDialogDescription>
                        「{initial?.name}」会被移入回收站。已经开始的对话不会消失，
                        但之后无法再从模板中使用这个角色。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>再想想</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void handleDelete()}
                        disabled={deleting}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleting ? "删除中…" : "确认删除"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
