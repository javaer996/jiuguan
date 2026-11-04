"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Loader2,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import type { AiDraft } from "@/lib/ai/drafts";
import type { AiKind } from "@/lib/ai/kinds";
import type { CreativeBrief } from "@/lib/ai/studio-schema";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import {
  STUDIO_PROMPT_KEYS,
  STUDIO_PROMPT_LABELS,
  type StudioPromptKey,
  type StudioPromptOverrides,
  type StudioPromptPair,
  type StudioPromptPreview,
} from "@/lib/types/studio";

function noteFor(key: StudioPromptKey) {
  switch (key) {
    case "optimize":
      return "只用于本次灵感优化，不会写入管理员全局配置。留空字段会使用默认内容。";
    case "worldbook":
      return "先生成条目大纲；这里就是大纲阶段的最终提示词。留空字段会使用默认内容。";
    case "worldbookExpansion":
      return "条目扩写阶段使用。{{worldbook_name}}、{{outline_list}}、{{batch_entries_json}} 等占位符会在生成时自动填入。留空字段会使用默认内容。";
    default:
      return "手动修改后会按这里的文本原样发送；如果 user 中没有 {{idea}}，会在末尾自动追加本次灵感与纲要。留空字段会使用默认内容。";
  }
}

function regenerateKindFor(key: StudioPromptKey): AiKind | null {
  if (key === "optimize") return null;
  if (key === "worldbookExpansion") return "worldbook";
  return key;
}

export function StudioPromptDialog({
  open,
  onOpenChange,
  idea,
  brief,
  kinds,
  worldbookEntryCount,
  drafts,
  overrides,
  mode,
  initialKey,
  onApply,
  onApplyAndRegenerate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idea: string;
  brief: CreativeBrief | null;
  kinds: AiKind[];
  worldbookEntryCount: number;
  drafts: Partial<Record<AiKind, AiDraft>>;
  overrides: StudioPromptOverrides;
  mode: "batch" | "regenerate";
  initialKey?: StudioPromptKey;
  onApply: (overrides: StudioPromptOverrides) => void;
  onApplyAndRegenerate?: (
    overrides: StudioPromptOverrides,
    kind: AiKind,
  ) => void;
}) {
  const visibleKeys = useMemo<StudioPromptKey[]>(() => {
    const keys: StudioPromptKey[] = ["optimize"];
    for (const kind of kinds) {
      if (kind === "worldbook") {
        keys.push("worldbook", "worldbookExpansion");
      } else {
        keys.push(kind);
      }
    }
    return keys;
  }, [kinds]);

  const [tab, setTab] = useState<StudioPromptKey>("optimize");
  const [preview, setPreview] = useState<StudioPromptPreview | null>(null);
  const [local, setLocal] = useState<
    Partial<Record<StudioPromptKey, StudioPromptPair>>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const loading = !preview && !error;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    void (async () => {
      try {
        const data = await apiFetch<StudioPromptPreview>(
          "/api/ai/studio/prompts",
          {
            method: "POST",
            body: JSON.stringify({
              idea,
              brief,
              kinds,
              worldbookEntryCount,
              // 批量预览不需要其他草稿；只有单项重生成才用它们保持一致性。
              existing: mode === "regenerate" ? drafts : undefined,
              overrides,
              mode,
            }),
          },
        );
        if (cancelled) return;
        setPreview(data);
        setLocal({ ...data.effective });
        setTab(
          initialKey && visibleKeys.includes(initialKey)
            ? initialKey
            : (visibleKeys[0] ?? "optimize"),
        );
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiClientError
            ? err.message
            : "提示词加载失败，请稍后再试",
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    reloadToken,
    idea,
    brief,
    kinds,
    worldbookEntryCount,
    drafts,
    overrides,
    mode,
    initialKey,
    visibleKeys,
  ]);

  function isOverridden(key: StudioPromptKey) {
    const localPair = local[key];
    const defaultPair = preview?.defaults[key];
    if (!localPair || !defaultPair) return false;
    return (
      localPair.system !== defaultPair.system ||
      localPair.user !== defaultPair.user
    );
  }

  const overriddenCount = preview
    ? STUDIO_PROMPT_KEYS.filter((key) => isOverridden(key)).length
    : 0;

  function update(field: "system" | "user", value: string) {
    setLocal((previous) => {
      const current =
        previous[tab] ??
        preview?.effective[tab] ?? { system: "", user: "" };
      return {
        ...previous,
        [tab]: { ...current, [field]: value },
      };
    });
  }

  function resetCurrent() {
    if (!preview) return;
    setLocal((previous) => ({
      ...previous,
      [tab]: { ...preview.defaults[tab] },
    }));
  }

  function collectOverrides(): StudioPromptOverrides {
    if (!preview) return overrides;
    const result: StudioPromptOverrides = {};
    for (const key of STUDIO_PROMPT_KEYS) {
      const localPair = local[key];
      const defaultPair = preview.defaults[key];
      if (!localPair || !defaultPair) continue;

      const systemChanged =
        localPair.system.trim() !== "" &&
        localPair.system !== defaultPair.system;
      const userChanged =
        localPair.user.trim() !== "" && localPair.user !== defaultPair.user;

      if (systemChanged || userChanged) {
        result[key] = {
          ...(systemChanged ? { system: localPair.system } : {}),
          ...(userChanged ? { user: localPair.user } : {}),
        };
      }
    }
    return result;
  }

  function apply() {
    onApply(collectOverrides());
    onOpenChange(false);
  }

  const regenerateKind = regenerateKindFor(tab);
  const canRegenerate =
    Boolean(onApplyAndRegenerate) && regenerateKind !== null;

  function applyAndRegenerate() {
    if (!onApplyAndRegenerate || !regenerateKind) return;
    onApplyAndRegenerate(collectOverrides(), regenerateKind);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="size-4 text-primary" />
            生成提示词
          </DialogTitle>
          <DialogDescription>
            这里展示的是生成各类资产时实际发给 AI 的 system 与 user
            消息。修改后按你的文本发送，不会影响管理员全局配置。
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            正在组装提示词…
          </div>
        ) : error ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
            <AlertCircle className="size-6 text-destructive" />
            <p className="max-w-md text-xs leading-relaxed text-destructive">
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setReloadToken((value) => value + 1);
              }}
              className="rounded-lg"
            >
              重试
            </Button>
          </div>
        ) : preview ? (
          <div className="space-y-4">
            <Tabs
              value={tab}
              onValueChange={(value) => setTab(value as StudioPromptKey)}
              className="gap-4"
            >
              <div className="-mx-1 overflow-x-auto pb-1">
                <TabsList
                  variant="line"
                  className="h-auto min-w-max justify-start gap-0.5 bg-transparent p-0"
                >
                  {visibleKeys.map((key) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="h-9 flex-none rounded-lg px-3 text-xs"
                    >
                      {STUDIO_PROMPT_LABELS[key]}
                      {isOverridden(key) && (
                        <span className="size-1.5 rounded-full bg-primary" />
                      )}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {visibleKeys.map((key) => {
                const pair = local[key] ?? preview.effective[key];
                const overridden = isOverridden(key);
                return (
                  <TabsContent key={key} value={key}>
                    <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h2 className="font-display text-base font-medium">
                            {STUDIO_PROMPT_LABELS[key]}
                          </h2>
                          <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-muted-foreground">
                            {noteFor(key)}
                          </p>
                        </div>
                        <Badge variant={overridden ? "default" : "secondary"}>
                          {overridden ? "已调整" : "默认"}
                        </Badge>
                      </div>

                      <div className="mt-4 space-y-4">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={`studio-prompt-${key}-system`}>
                              System
                            </Label>
                            <span className="text-[10px] text-muted-foreground">
                              {pair.system.length}/50000
                            </span>
                          </div>
                          <Textarea
                            id={`studio-prompt-${key}-system`}
                            value={pair.system}
                            onChange={(event) =>
                              update("system", event.target.value)
                            }
                            maxLength={50_000}
                            className="mt-1.5 min-h-48 rounded-xl bg-background/50 font-mono text-[11px] leading-relaxed"
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={`studio-prompt-${key}-user`}>
                              User
                            </Label>
                            <span className="text-[10px] text-muted-foreground">
                              {pair.user.length}/50000
                            </span>
                          </div>
                          <Textarea
                            id={`studio-prompt-${key}-user`}
                            value={pair.user}
                            onChange={(event) =>
                              update("user", event.target.value)
                            }
                            maxLength={50_000}
                            className="mt-1.5 min-h-40 rounded-xl bg-background/50 font-mono text-[11px] leading-relaxed"
                          />
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={resetCurrent}
                          disabled={!overridden}
                          className="rounded-lg"
                        >
                          <RotateCcw data-icon="inline-start" />
                          恢复默认
                        </Button>
                      </div>
                    </section>
                  </TabsContent>
                );
              })}
            </Tabs>

            <details className="rounded-xl border border-border/50 bg-background/30">
              <summary className="cursor-pointer list-none px-3.5 py-2.5 text-[11px] text-muted-foreground transition-colors hover:text-foreground">
                查看本次发送的灵感与纲要上下文
              </summary>
              <pre className="max-h-60 overflow-auto border-t border-border/40 p-3.5 font-mono text-[10px] leading-relaxed whitespace-pre-wrap break-words">
                {preview.enrichedIdea}
              </pre>
            </details>
          </div>
        ) : null}

        <DialogFooter className="gap-2 sm:justify-between">
          <p className="px-1 text-[10px] text-muted-foreground">
            已调整 {overriddenCount} 项 · 修改灵感或纲要后建议恢复默认再调整
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl"
            >
              取消
            </Button>
            {canRegenerate && (
              <Button
                type="button"
                variant="outline"
                onClick={applyAndRegenerate}
                disabled={loading || Boolean(error)}
                className="rounded-xl"
              >
                <RotateCcw data-icon="inline-start" />
                应用并重生成
              </Button>
            )}
            <Button
              type="button"
              onClick={apply}
              disabled={loading || Boolean(error) || !preview}
              className="rounded-xl shadow-glow"
            >
              应用调整
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
