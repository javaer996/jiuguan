"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  Lightbulb,
  Loader2,
  PencilLine,
  Save,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { PersonaEditorDialog } from "@/components/personas/persona-editor-dialog";
import { StudioBriefEditor } from "@/components/studio/studio-brief-editor";
import { StudioDraftPreview } from "@/components/studio/studio-draft-preview";
import { StudioKindCard } from "@/components/studio/studio-kind-card";
import { KIND_META, KIND_ORDER, SAMPLES } from "@/components/studio/studio-meta";
import { StudioPromptDialog } from "@/components/studio/studio-prompt-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { AiDraft } from "@/lib/ai/drafts";
import { AI_KINDS, type AiKind } from "@/lib/ai/kinds";
import type { CreativeBrief } from "@/lib/ai/studio-schema";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { openSse, readSse } from "@/lib/client/sse";
import type {
  StudioKindStatus,
  StudioPromptKey,
  StudioPromptOverrides,
  StudioSaveResult,
  StudioSavedState,
  StudioStreamEvent,
} from "@/lib/types/studio";

type ProviderOption = {
  id: string;
  name: string;
  model: string;
  isDefault: boolean;
};

const STORAGE_VERSION = 1;
const STORAGE_PREFIX = "jiuguan:studio";
const WORLD_BOOK_COUNTS = [6, 10, 14];
/** 用户身份下拉里“根据纲要新建身份”的哨兵值。 */
const NEW_PERSONA = "__new__";
const IDEA_SAMPLES = [
  SAMPLES.character[0],
  SAMPLES.worldbook[0],
  SAMPLES.theme[0],
];

function emptyStatuses(): Record<AiKind, StudioKindStatus> {
  return Object.fromEntries(
    AI_KINDS.map((kind) => [kind, { status: "idle" as const }]),
  ) as Record<AiKind, StudioKindStatus>;
}

function isAbortError(error: unknown, controller: AbortController) {
  return (
    controller.signal.aborted ||
    (error instanceof Error && error.name === "AbortError")
  );
}

export function AiStudio({
  providers,
  personas,
  userId,
}: {
  providers: ProviderOption[];
  personas: {
    id: string;
    name: string;
    description?: string | null;
    isDefault?: boolean;
  }[];
  userId: string;
}) {
  const defaultProvider =
    providers.find((provider) => provider.isDefault) ?? providers[0];
  const storageKey = `${STORAGE_PREFIX}:${userId}:v${STORAGE_VERSION}`;

  const [idea, setIdea] = useState("");
  const [brief, setBrief] = useState<CreativeBrief | null>(null);
  const [briefSourceIdea, setBriefSourceIdea] = useState("");
  const [drafts, setDrafts] = useState<Partial<Record<AiKind, AiDraft>>>({});
  const [statuses, setStatuses] =
    useState<Record<AiKind, StudioKindStatus>>(emptyStatuses);
  const [selectedKinds, setSelectedKinds] = useState<AiKind[]>([
    ...KIND_ORDER,
  ]);
  const [worldbookEntryCount, setWorldbookEntryCount] = useState(10);
  const [providerId, setProviderId] = useState(defaultProvider?.id ?? "");
  const [personaOptions, setPersonaOptions] = useState(personas);
  const [personaId, setPersonaId] = useState("");
  const [personaName, setPersonaName] = useState("");
  const [personaDescription, setPersonaDescription] = useState("");
  const [personaEditorOpen, setPersonaEditorOpen] = useState(false);
  const [overrides, setOverrides] = useState<StudioPromptOverrides>({});
  const [manualTemplateName, setManualTemplateName] = useState("");
  const [manualTemplateDescription, setManualTemplateDescription] =
    useState("");
  const [saved, setSaved] = useState<{
    result: StudioSaveResult;
    signature: string;
  } | null>(null);

  const [generating, setGenerating] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const [briefOpen, setBriefOpen] = useState(false);
  // 每次重新优化时递增，用来重置编辑器的列表输入缓存。
  const [briefRevision, setBriefRevision] = useState(0);
  const [promptOpen, setPromptOpen] = useState(false);
  const [promptMode, setPromptMode] = useState<"batch" | "regenerate">("batch");
  const [promptKinds, setPromptKinds] = useState<AiKind[]>([...KIND_ORDER]);
  const [promptInitialKey, setPromptInitialKey] =
    useState<StudioPromptKey>("optimize");
  const [previewKind, setPreviewKind] = useState<AiKind | null>(null);
  const [confirmGenerateOpen, setConfirmGenerateOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const loadedRef = useRef(false);
  const personaTouchedRef = useRef(false);

  const templateName = brief?.templateName ?? manualTemplateName;
  const templateDescription =
    brief?.templateDescription ?? manualTemplateDescription;
  const selectedPersona =
    personaId && personaId !== NEW_PERSONA
      ? (personaOptions.find((persona) => persona.id === personaId) ?? null)
      : null;
  const personaDisplayName =
    selectedPersona?.name || personaName || brief?.userName || undefined;
  const briefStale = Boolean(brief) && briefSourceIdea !== idea.trim();

  const selectedDrafts = useMemo(
    () =>
      Object.fromEntries(
        selectedKinds
          .filter((kind) => drafts[kind])
          .map((kind) => [kind, drafts[kind]!]),
      ) as Partial<Record<AiKind, AiDraft>>,
    [drafts, selectedKinds],
  );

  const generatedCount = selectedKinds.filter((kind) => drafts[kind]).length;
  const missingKinds = selectedKinds.filter((kind) => !drafts[kind]);

  const saveSignature = useMemo(
    () =>
      JSON.stringify({
        drafts: selectedDrafts,
        templateName,
        templateDescription,
      }),
    [selectedDrafts, templateName, templateDescription],
  );
  const alreadySaved = saved?.signature === saveSignature;

  function setTemplateName(value: string) {
    if (brief) setBrief({ ...brief, templateName: value });
    else setManualTemplateName(value);
  }

  function setTemplateDescription(value: string) {
    if (brief) setBrief({ ...brief, templateDescription: value });
    else setManualTemplateDescription(value);
  }

  /* ---------------- localStorage ---------------- */

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    // 放到宏任务里恢复，避免 SSR 首屏与客户端状态不一致，也避免同步 setState 引发级联渲染。
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) return;
        const data = JSON.parse(raw) as Partial<StudioSavedState> | null;
        if (!data || data.version !== STORAGE_VERSION) return;

        if (typeof data.idea === "string") setIdea(data.idea);
        if (
          data.brief &&
          typeof data.brief === "object" &&
          typeof data.brief.templateName === "string" &&
          Array.isArray(data.brief.worldbookTopics)
        ) {
          // 旧版本存储没有 userName，恢复时补齐，避免编辑器读取 undefined。
          setBrief({
            ...data.brief,
            userName:
              typeof data.brief.userName === "string"
                ? data.brief.userName
                : "",
          });
        }
        if (typeof data.briefSourceIdea === "string") {
          setBriefSourceIdea(data.briefSourceIdea);
        }

        const restoredDrafts = data.drafts;
        if (restoredDrafts && typeof restoredDrafts === "object") {
          setDrafts(restoredDrafts);
          const next = emptyStatuses();
          for (const kind of AI_KINDS) {
            if (restoredDrafts[kind]) next[kind] = { status: "done" };
          }
          setStatuses(next);
        }

        if (data.overrides && typeof data.overrides === "object") {
          setOverrides(data.overrides);
        }
        if (typeof data.providerId === "string") {
          setProviderId(
            providers.some((provider) => provider.id === data.providerId)
              ? data.providerId
              : (defaultProvider?.id ?? ""),
          );
        }
        if (typeof data.personaId === "string") {
          const validPersona =
            data.personaId === "" ||
            data.personaId === NEW_PERSONA ||
            personas.some((persona) => persona.id === data.personaId);
          if (validPersona) {
            setPersonaId(data.personaId);
            // 恢复的已有身份视为用户已选择，避免下次优化时被自动替换。
            personaTouchedRef.current =
              data.personaId !== "" && data.personaId !== NEW_PERSONA;
          }
        }
        if (typeof data.personaName === "string") {
          setPersonaName(data.personaName);
        }
        if (typeof data.personaDescription === "string") {
          setPersonaDescription(data.personaDescription);
        }
        if (Array.isArray(data.selectedKinds)) {
          const valid = data.selectedKinds.filter((kind): kind is AiKind =>
            KIND_ORDER.includes(kind as AiKind),
          );
          if (valid.length > 0) {
            setSelectedKinds(
              KIND_ORDER.filter((kind) => valid.includes(kind)),
            );
          }
        }
        if (
          typeof data.worldbookEntryCount === "number" &&
          WORLD_BOOK_COUNTS.includes(data.worldbookEntryCount)
        ) {
          setWorldbookEntryCount(data.worldbookEntryCount);
        }
        if (typeof data.manualTemplateName === "string") {
          setManualTemplateName(data.manualTemplateName);
        }
        if (typeof data.manualTemplateDescription === "string") {
          setManualTemplateDescription(data.manualTemplateDescription);
        }
        if (
          data.saved &&
          typeof data.saved === "object" &&
          data.saved.result?.template?.href &&
          data.saved.result.assets
        ) {
          setSaved(data.saved);
        }
      } catch {
        // 存储损坏时忽略，保留空白工作台
      } finally {
        setHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [storageKey, providers, personas, defaultProvider?.id]);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => {
      try {
        const state: StudioSavedState = {
          version: STORAGE_VERSION,
          idea,
          brief,
          briefSourceIdea,
          drafts,
          overrides,
          providerId,
          selectedKinds,
          worldbookEntryCount,
          personaId,
          personaName,
          personaDescription,
          manualTemplateName,
          manualTemplateDescription,
          saved,
        };
        window.localStorage.setItem(storageKey, JSON.stringify(state));
      } catch {
        // 隐私模式或配额不足时静默降级
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [
    hydrated,
    storageKey,
    idea,
    brief,
    briefSourceIdea,
    drafts,
    overrides,
    providerId,
    selectedKinds,
    worldbookEntryCount,
    personaId,
    personaName,
    personaDescription,
    manualTemplateName,
    manualTemplateDescription,
    saved,
  ]);

  /* ---------------- 生成 ---------------- */

  async function consumeStream(response: Response) {
    let doneReceived = false;

    for await (const event of readSse(response)) {
      if (!event.data) continue;
      let data: StudioStreamEvent;
      try {
        data = JSON.parse(event.data) as StudioStreamEvent;
      } catch {
        continue;
      }

      switch (data.type) {
        case "start":
          break;
        case "kind_start":
          setStatuses((previous) => ({
            ...previous,
            [data.kind]: { status: "running" },
          }));
          break;
        case "progress":
          setStatuses((previous) => ({
            ...previous,
            [data.kind]: {
              ...previous[data.kind],
              status: "running",
              step: data.message,
            },
          }));
          break;
        case "draft":
          setDrafts((previous) => ({
            ...previous,
            [data.kind]: data.draft,
          }));
          setStatuses((previous) => ({
            ...previous,
            [data.kind]: { status: "done", warnings: data.warnings },
          }));
          break;
        case "kind_error":
          setStatuses((previous) => ({
            ...previous,
            [data.kind]: { status: "error", error: data.message },
          }));
          break;
        case "error":
          throw new Error(data.message);
        case "done":
          doneReceived = true;
          break;
      }
    }

    if (!doneReceived) {
      throw new Error("生成连接中断，请重试");
    }
  }

  async function startGeneration() {
    if (generating || optimizing) return;
    if (idea.trim().length < 2) {
      toast.error("先写下一点灵感吧");
      return;
    }
    if (selectedKinds.length === 0) {
      toast.error("至少选择一种生成内容");
      return;
    }
    if (providers.length === 0) {
      toast.error("还没有可用的 AI 供应商");
      return;
    }

    setGenerating(true);
    setStatuses((previous) => {
      const next = { ...previous };
      for (const kind of selectedKinds) next[kind] = { status: "queued" };
      return next;
    });

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await openSse(
        "/api/ai/studio/generate",
        {
          mode: "batch",
          idea: idea.trim(),
          brief,
          kinds: selectedKinds,
          providerId: providerId || null,
          worldbookEntryCount,
          overrides,
        },
        controller.signal,
      );
      await consumeStream(response);
      toast.success("整套生成完成");
    } catch (error) {
      if (isAbortError(error, controller)) {
        toast.message("已停止生成");
        setStatuses((previous) => {
          const next = { ...previous };
          for (const kind of selectedKinds) {
            if (
              next[kind].status === "running" ||
              next[kind].status === "queued"
            ) {
              // 草稿本身保留在 drafts 里；状态回到待生成，避免清空工作台后被旧闭包覆盖。
              next[kind] = { status: "idle" };
            }
          }
          return next;
        });
      } else {
        toast.error(
          error instanceof Error ? error.message : "生成失败，请稍后再试",
        );
      }
    } finally {
      abortRef.current = null;
      setGenerating(false);
    }
  }

  function requestGenerate() {
    if (selectedKinds.some((kind) => drafts[kind])) {
      setConfirmGenerateOpen(true);
    } else {
      void startGeneration();
    }
  }

  async function regenerate(
    kind: AiKind,
    nextOverrides?: StudioPromptOverrides,
  ) {
    if (generating || optimizing) return;
    if (idea.trim().length < 2) {
      toast.error("先写下一点灵感吧");
      return;
    }
    if (providers.length === 0) {
      toast.error("还没有可用的 AI 供应商");
      return;
    }

    setGenerating(true);
    setStatuses((previous) => ({
      ...previous,
      [kind]: { status: "running" },
    }));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await openSse(
        "/api/ai/studio/generate",
        {
          mode: "regenerate",
          idea: idea.trim(),
          brief,
          kinds: [kind],
          providerId: providerId || null,
          worldbookEntryCount,
          existing: drafts,
          overrides: nextOverrides ?? overrides,
        },
        controller.signal,
      );
      await consumeStream(response);
      toast.success(`${KIND_META[kind].label}已重生成`);
    } catch (error) {
      if (isAbortError(error, controller)) {
        toast.message("已停止生成");
        setStatuses((previous) => ({
          ...previous,
          [kind]: { status: "idle" },
        }));
      } else {
        toast.error(
          error instanceof Error ? error.message : "重生成失败，请稍后再试",
        );
      }
    } finally {
      abortRef.current = null;
      setGenerating(false);
    }
  }

  async function optimize() {
    if (optimizing || generating) return;
    if (idea.trim().length < 2) {
      toast.error("先写下一点灵感吧");
      return;
    }
    if (providers.length === 0) {
      toast.error("还没有可用的 AI 供应商");
      return;
    }

    setOptimizing(true);
    try {
      const result = await apiFetch<{ brief: CreativeBrief; model: string }>(
        "/api/ai/studio/optimize",
        {
          method: "POST",
          body: JSON.stringify({
            idea: idea.trim(),
            providerId: providerId || null,
            overrides,
            currentBrief: brief,
          }),
        },
      );
      setBrief(result.brief);
      setBriefSourceIdea(idea.trim());
      setBriefRevision((value) => value + 1);
      // 用户还没手动选身份时，默认根据纲要新建一个，避免模板一直使用默认身份。
      if (
        !personaTouchedRef.current &&
        (result.brief.userName || result.brief.userRole)
      ) {
        setPersonaId(NEW_PERSONA);
        setPersonaName(result.brief.userName);
        setPersonaDescription(result.brief.userRole);
      }
      toast.success("创作纲要已生成，可修改后开始生成");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "优化失败，请稍后再试",
      );
    } finally {
      setOptimizing(false);
    }
  }

  /* ---------------- 保存 ---------------- */

  async function save() {
    if (saving || generating || alreadySaved) return;
    if (!templateName.trim()) {
      toast.error("先给对话模板起个名字");
      return;
    }
    if (Object.keys(selectedDrafts).length === 0) {
      toast.error("还没有可保存的内容");
      return;
    }
    const creatingPersona = personaId === NEW_PERSONA;
    if (creatingPersona && !personaName.trim()) {
      toast.error("先填写用户身份名称");
      return;
    }

    setSaving(true);
    try {
      const result = await apiFetch<StudioSaveResult>(
        "/api/ai/studio/save",
        {
          method: "POST",
          body: JSON.stringify({
            drafts: selectedDrafts,
            templateName: templateName.trim(),
            templateDescription: templateDescription.trim() || null,
            providerId: providerId || null,
            personaId: creatingPersona ? null : personaId || null,
            persona: creatingPersona
              ? {
                  name: personaName.trim(),
                  description: personaDescription.trim() || null,
                }
              : null,
          }),
        },
      );
      const createdPersona = result.persona;
      if (createdPersona) {
        setPersonaOptions((previous) =>
          previous.some((persona) => persona.id === createdPersona.id)
            ? previous
            : [...previous, createdPersona],
        );
        // 后续“另存为新模板”复用刚创建的身份，避免重复创建。
        setPersonaId(createdPersona.id);
      }
      setSaved({ result, signature: saveSignature });
      toast.success("已保存为对话模板");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "保存失败，请稍后再试",
      );
    } finally {
      setSaving(false);
    }
  }

  function clear() {
    abortRef.current?.abort();
    abortRef.current = null;
    setIdea("");
    setBrief(null);
    setBriefSourceIdea("");
    setDrafts({});
    setStatuses(emptyStatuses());
    setSelectedKinds([...KIND_ORDER]);
    setWorldbookEntryCount(10);
    setProviderId(defaultProvider?.id ?? "");
    setPersonaId("");
    setPersonaName("");
    setPersonaDescription("");
    personaTouchedRef.current = false;
    setOverrides({});
    setManualTemplateName("");
    setManualTemplateDescription("");
    setSaved(null);
    setGenerating(false);
    setOptimizing(false);
    setSaving(false);
    setPreviewKind(null);
    setBriefOpen(false);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    toast.success("工作台已清空");
  }

  /* ---------------- 提示词 ---------------- */

  function openPromptDialog(options?: {
    kind?: AiKind;
    key?: StudioPromptKey;
  }) {
    if (options?.kind) {
      setPromptMode("regenerate");
      setPromptKinds([options.kind]);
      setPromptInitialKey(options.key ?? options.kind);
    } else {
      setPromptMode("batch");
      setPromptKinds([...selectedKinds]);
      setPromptInitialKey("optimize");
    }
    setPromptOpen(true);
  }

  function applyAndRegenerate(
    next: StudioPromptOverrides,
    kind: AiKind,
  ) {
    setOverrides(next);
    void regenerate(kind, next);
  }

  function toggleKind(kind: AiKind, checked: boolean) {
    setSelectedKinds((previous) => {
      const next = checked
        ? [...new Set([...previous, kind])]
        : previous.filter((item) => item !== kind);
      return KIND_ORDER.filter((item) => next.includes(item));
    });
  }

  const allSelected = selectedKinds.length === KIND_ORDER.length;
  const busy = generating || optimizing;

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
      <div className="space-y-4">
        {/* 灵感 */}
        <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-medium">灵感</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                一句话、一个画面、一段设定都可以。AI 会把它扩展成整套资产。
              </p>
            </div>
            <Badge variant="secondary">{idea.length}/12000</Badge>
          </div>

          <Textarea
            value={idea}
            onChange={(event) => setIdea(event.target.value)}
            placeholder="例如：雨夜里经营旧书店的盲眼说书人，能听见书页里的秘密……"
            maxLength={12_000}
            disabled={busy}
            className="mt-3 min-h-40 resize-none rounded-xl bg-background/50 leading-relaxed"
          />

          <div className="mt-2 flex flex-wrap gap-1.5">
            {IDEA_SAMPLES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setIdea(sample)}
                disabled={busy}
                className="inline-flex items-center gap-1 rounded-full border border-border/60 px-2.5 py-1 text-left text-[10px] text-muted-foreground transition-colors hover:border-primary/30 hover:text-primary disabled:opacity-50"
              >
                <Lightbulb className="size-3" />
                {sample.length > 22 ? `${sample.slice(0, 22)}…` : sample}
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => void optimize()}
              disabled={busy || idea.trim().length < 2}
              className="rounded-xl"
            >
              {optimizing ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <Wand2 data-icon="inline-start" />
              )}
              {optimizing ? "优化中…" : "一键优化灵感"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => openPromptDialog()}
              disabled={busy || selectedKinds.length === 0}
              className="rounded-xl"
            >
              <SlidersHorizontal data-icon="inline-start" />
              预览提示词
            </Button>
          </div>
        </section>

        {/* 生成范围 */}
        <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-medium">生成范围</h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                未勾选的资产不会生成，也不会放进模板。
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                setSelectedKinds(allSelected ? [] : [...KIND_ORDER])
              }
              disabled={busy}
              className="text-[11px] text-primary hover:underline disabled:opacity-50"
            >
              {allSelected ? "取消全选" : "全选"}
            </button>
          </div>

          <div className="mt-3 grid gap-2">
            {KIND_ORDER.map((kind) => {
              const meta = KIND_META[kind];
              const Icon = meta.icon;
              const checked = selectedKinds.includes(kind);
              return (
                <label
                  key={kind}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                    checked
                      ? "border-primary/30 bg-primary/5"
                      : "border-border/60 hover:border-primary/20"
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      toggleKind(kind, value === true)
                    }
                    disabled={busy}
                  />
                  <Icon className="size-4 text-primary" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium">
                      {meta.label}
                    </span>
                    <span className="block truncate text-[10px] text-muted-foreground">
                      {meta.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label>世界书条目数</Label>
              <Select
                value={String(worldbookEntryCount)}
                onValueChange={(value) =>
                  setWorldbookEntryCount(Number(value))
                }
                disabled={busy || !selectedKinds.includes("worldbook")}
              >
                <SelectTrigger className="mt-1.5 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORLD_BOOK_COUNTS.map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count} 条
                      {count === 6
                        ? " · 轻量"
                        : count === 10
                          ? " · 标准"
                          : " · 丰富"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>AI 供应商</Label>
              {providers.length === 0 ? (
                <div className="mt-1.5 rounded-xl border border-dashed border-border/70 px-3 py-2.5 text-[10px] leading-relaxed text-muted-foreground">
                  还没有可用供应商。
                  <Link
                    href="/settings"
                    className="ml-1 text-primary hover:underline"
                  >
                    去设置
                  </Link>
                </div>
              ) : (
                <Select
                  value={providerId || "default"}
                  onValueChange={(value) =>
                    setProviderId(value === "default" ? "" : value)
                  }
                  disabled={busy}
                >
                  <SelectTrigger className="mt-1.5 w-full rounded-xl">
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
          </div>

          <Button
            type="button"
            onClick={requestGenerate}
            disabled={
              busy ||
              providers.length === 0 ||
              selectedKinds.length === 0 ||
              idea.trim().length < 2
            }
            className="mt-4 w-full rounded-xl shadow-glow"
          >
            {generating ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            {generating ? "正在生成整套…" : "开始生成整套"}
          </Button>

          {generating && (
            <Button
              type="button"
              variant="outline"
              onClick={() => abortRef.current?.abort()}
              className="mt-2 w-full rounded-xl"
            >
              <Square data-icon="inline-start" />
              停止生成
            </Button>
          )}

          <p className="mt-2 text-center text-[10px] leading-relaxed text-muted-foreground">
            生成会消耗你的 API 额度；草稿只保存在本地，确认后再保存为模板。
          </p>
        </section>

        {/* 创作纲要 */}
        {brief && (
          <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-medium">创作纲要</h2>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {briefStale
                    ? "灵感已修改，建议重新优化后再生成"
                    : "生成时会作为整套资产的统一设定"}
                </p>
              </div>
              <Badge variant={briefStale ? "default" : "secondary"}>
                {briefStale ? "待更新" : "已确认"}
              </Badge>
            </div>

            <div className="mt-3 space-y-2 text-xs leading-relaxed">
              <p className="font-medium">{brief.templateName}</p>
              {brief.templateDescription && (
                <p className="text-muted-foreground">
                  {brief.templateDescription}
                </p>
              )}
              {(brief.userName || brief.userRole) && (
                <p className="line-clamp-2 text-muted-foreground">
                  用户身份：
                  {[brief.userName, brief.userRole].filter(Boolean).join(" · ")}
                </p>
              )}
              {brief.premise && (
                <p className="line-clamp-4 text-muted-foreground">
                  {brief.premise}
                </p>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBriefOpen(true)}
                disabled={busy}
                className="rounded-lg"
              >
                编辑纲要
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void optimize()}
                disabled={busy}
                className="rounded-lg"
              >
                <Wand2 data-icon="inline-start" />
                重新优化
              </Button>
            </div>
          </section>
        )}

        {/* 模板与保存 */}
        <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-medium">对话模板</h2>
              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                保存后会创建角色卡、世界书、提示词、样式、主题，以及可选的用户身份，并把它们组装成一个模板。
              </p>
            </div>
            <Badge variant="secondary">
              {generatedCount}/{selectedKinds.length}
            </Badge>
          </div>

          <div className="mt-4 space-y-3">
            <Field
              label="用户身份"
              hint="对话中的 {{user}} 会显示为这个名称"
              htmlFor="studio-persona"
            >
              <Select
                value={personaId || "default"}
                onValueChange={(value) => {
                  personaTouchedRef.current = true;
                  if (value === "default") {
                    setPersonaId("");
                    return;
                  }
                  if (value === NEW_PERSONA) {
                    setPersonaId(NEW_PERSONA);
                    if (brief) {
                      setPersonaName((previous) => previous || brief.userName);
                      setPersonaDescription(
                        (previous) => previous || brief.userRole,
                      );
                    }
                    return;
                  }
                  setPersonaId(value);
                }}
                disabled={busy || saving}
              >
                <SelectTrigger
                  id="studio-persona"
                  className="mt-1.5 w-full rounded-xl"
                >
                  <SelectValue placeholder="跟随默认身份" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">跟随默认身份</SelectItem>
                  {personaOptions.map((persona) => (
                    <SelectItem key={persona.id} value={persona.id}>
                      {persona.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={NEW_PERSONA}>
                    根据纲要新建身份
                  </SelectItem>
                </SelectContent>
              </Select>
              {selectedPersona && (
                <div className="mt-1 flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                    {selectedPersona.description || "尚未填写身份特点"}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPersonaEditorOpen(true)}
                    disabled={busy || saving}
                    className="h-7 shrink-0 rounded-lg px-2 text-[11px]"
                  >
                    <PencilLine data-icon="inline-start" />
                    编辑
                  </Button>
                </div>
              )}
            </Field>

            {personaId === NEW_PERSONA && (
              <div className="space-y-3 rounded-xl border border-border/60 bg-background/30 p-3">
                <Field label="身份名称" htmlFor="studio-persona-name">
                  <Input
                    id="studio-persona-name"
                    value={personaName}
                    onChange={(event) => {
                      personaTouchedRef.current = true;
                      setPersonaName(event.target.value);
                    }}
                    maxLength={48}
                    disabled={busy || saving}
                    placeholder="例如：旅人"
                    className="rounded-xl bg-background/50"
                  />
                </Field>
                <Field
                  label="身份与处境"
                  htmlFor="studio-persona-description"
                >
                  <Textarea
                    id="studio-persona-description"
                    value={personaDescription}
                    onChange={(event) => {
                      personaTouchedRef.current = true;
                      setPersonaDescription(event.target.value);
                    }}
                    maxLength={20_000}
                    rows={3}
                    disabled={busy || saving}
                    placeholder="你在故事里的身份、处境与目标"
                    className="rounded-xl bg-background/50 text-xs leading-relaxed"
                  />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!brief) return;
                    setPersonaName(brief.userName);
                    setPersonaDescription(brief.userRole);
                    personaTouchedRef.current = true;
                  }}
                  disabled={!brief || busy || saving}
                  className="rounded-lg"
                >
                  <Wand2 data-icon="inline-start" />
                  从纲要填入
                </Button>
              </div>
            )}

            <Field label="模板名称" htmlFor="studio-template-name">
              <Input
                id="studio-template-name"
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                maxLength={80}
                disabled={busy || saving}
                placeholder="例如：雾港夜话"
                className="rounded-xl bg-background/50"
              />
            </Field>
            <Field label="简介" htmlFor="studio-template-description">
              <Textarea
                id="studio-template-description"
                value={templateDescription}
                onChange={(event) =>
                  setTemplateDescription(event.target.value)
                }
                maxLength={400}
                rows={2}
                disabled={busy || saving}
                placeholder="一句话说明这套设定"
                className="rounded-xl bg-background/50 text-xs leading-relaxed"
              />
            </Field>
          </div>

          {missingKinds.length > 0 && (
            <p className="mt-3 text-[10px] leading-relaxed text-amber-600 dark:text-amber-400">
              模板将不包含未生成项：
              {missingKinds.map((kind) => KIND_META[kind].label).join("、")}
            </p>
          )}

          <Button
            type="button"
            onClick={() => void save()}
            disabled={
              saving ||
              busy ||
              alreadySaved ||
              !templateName.trim() ||
              Object.keys(selectedDrafts).length === 0
            }
            className="mt-4 w-full rounded-xl shadow-glow"
          >
            {saving ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : alreadySaved ? (
              <Check data-icon="inline-start" />
            ) : (
              <Save data-icon="inline-start" />
            )}
            {saving
              ? "保存中…"
              : alreadySaved
                ? "已保存"
                : saved
                  ? "另存为新模板"
                  : "一键保存为对话模板"}
          </Button>

          {saved && (
            <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3">
              <p className="text-xs font-medium">已保存到对话模板</p>
              <Link
                href={saved.result.template.href}
                className="mt-2 inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
              >
                打开模板
                <ArrowRight className="size-3" />
              </Link>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {KIND_ORDER.filter((kind) => saved.result.assets[kind]).map(
                  (kind) => (
                    <Link
                      key={kind}
                      href={saved.result.assets[kind]!.href}
                      className="text-[10px] text-muted-foreground hover:text-primary hover:underline"
                    >
                      {KIND_META[kind].label}
                    </Link>
                  ),
                )}
              </div>
              {saved.result.persona && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  已创建用户身份：{saved.result.persona.name}
                </p>
              )}
              {saved.result.skipped.length > 0 && (
                <p className="mt-2 text-[10px] text-muted-foreground">
                  未包含：
                  {saved.result.skipped
                    .map((kind) => KIND_META[kind].label)
                    .join("、")}
                </p>
              )}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/40 pt-3">
            <p className="text-[10px] text-muted-foreground">
              已生成 {generatedCount}/{selectedKinds.length} 项
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setClearOpen(true)}
              disabled={generating || optimizing || saving}
              className="rounded-lg text-muted-foreground"
            >
              <Trash2 data-icon="inline-start" />
              新建一套
            </Button>
          </div>
        </section>
      </div>

      {/* 右侧草稿区 */}
      <div className="min-w-0 space-y-4">
        {selectedKinds.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/20 p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </span>
            <h2 className="mt-4 font-display text-lg font-medium">
              先选择要生成的内容
            </h2>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
              在左侧勾选至少一种资产，写下灵感后就可以一次生成整套草稿。
            </p>
          </div>
        ) : generatedCount === 0 && !generating ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-card/20 p-8 text-center">
            <span className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="size-6" />
            </span>
            <h2 className="mt-4 font-display text-lg font-medium">
              灵感正在等一盏灯
            </h2>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
              写下灵感后点击「开始生成整套」。角色卡、世界书、提示词、样式和主题会并行生成，进度会实时显示在卡片上。
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {selectedKinds.map((kind) => (
              <StudioKindCard
                key={kind}
                kind={kind}
                draft={drafts[kind]}
                status={statuses[kind]}
                disabled={busy}
                onView={() => setPreviewKind(kind)}
                onRegenerate={() => void regenerate(kind)}
                onEditPrompt={() =>
                  openPromptDialog({ kind, key: kind })
                }
              />
            ))}
          </div>
        )}

        {generatedCount > 0 && (
          <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-border/60 bg-background/85 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <div className="px-1">
              <p className="text-[11px] text-muted-foreground">
                已生成 {generatedCount}/{selectedKinds.length} 项
              </p>
              {missingKinds.length > 0 && (
                <p className="text-[10px] text-amber-600 dark:text-amber-400">
                  还有 {missingKinds.length} 项未生成
                </p>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => openPromptDialog()}
                disabled={busy || selectedKinds.length === 0}
                className="rounded-xl"
              >
                <SlidersHorizontal data-icon="inline-start" />
                预览/调整提示词
              </Button>
              <Button
                type="button"
                onClick={() => void save()}
                disabled={
                  saving ||
                  busy ||
                  alreadySaved ||
                  !templateName.trim() ||
                  Object.keys(selectedDrafts).length === 0
                }
                className="rounded-xl shadow-glow"
              >
                {saving ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                {alreadySaved ? "已保存" : "保存为模板"}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 提示词预览/调整 */}
      <StudioPromptDialog
        key={promptOpen ? "prompt-open" : "prompt-closed"}
        open={promptOpen}
        onOpenChange={setPromptOpen}
        idea={idea.trim()}
        brief={brief}
        kinds={promptKinds}
        worldbookEntryCount={worldbookEntryCount}
        drafts={drafts}
        overrides={overrides}
        mode={promptMode}
        initialKey={promptInitialKey}
        onApply={setOverrides}
        onApplyAndRegenerate={applyAndRegenerate}
      />

      {/* 纲要编辑 */}
      {brief && (
        <StudioBriefEditor
          key={briefRevision}
          open={briefOpen}
          onOpenChange={setBriefOpen}
          brief={brief}
          onChange={setBrief}
        />
      )}

      {/* 编辑已选用户身份 */}
      {personaEditorOpen && selectedPersona && (
        <PersonaEditorDialog
          persona={selectedPersona}
          onClose={() => setPersonaEditorOpen(false)}
          onSaved={(persona) => {
            setPersonaOptions((previous) =>
              previous.map((item) =>
                item.id === persona.id ? { ...item, ...persona } : item,
              ),
            );
          }}
        />
      )}

      {/* 草稿预览 */}
      <Dialog
        open={previewKind !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewKind(null);
        }}
      >
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {previewKind ? KIND_META[previewKind].label : "草稿"}预览
            </DialogTitle>
            <DialogDescription>
              确认满意后再保存为对话模板；保存后仍可在对应编辑器中继续调整。
            </DialogDescription>
          </DialogHeader>
          {previewKind && drafts[previewKind] ? (
            <StudioDraftPreview
              kind={previewKind}
              draft={drafts[previewKind]!}
              styleConfig={
                drafts.style && "config" in drafts.style
                  ? drafts.style.config
                  : null
              }
              userName={personaDisplayName}
            />
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewKind(null)}
              className="rounded-xl"
            >
              关闭
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!previewKind) return;
                const kind = previewKind;
                setPreviewKind(null);
                void regenerate(kind);
              }}
              disabled={busy}
              className="rounded-xl"
            >
              重生成这一项
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 重新生成确认 */}
      <AlertDialog
        open={confirmGenerateOpen}
        onOpenChange={setConfirmGenerateOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>重新生成已选内容？</AlertDialogTitle>
            <AlertDialogDescription>
              将重新生成已选中的 {selectedKinds.length} 项，已有草稿会被新结果覆盖；未选中的草稿会保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={() => void startGeneration()}>
              继续生成
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 清空确认 */}
      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空工作台？</AlertDialogTitle>
            <AlertDialogDescription>
              会中止正在进行的生成，并清除本地保存的灵感、纲要和草稿。已经保存到资产的模板不受影响。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={clear}>清空</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
