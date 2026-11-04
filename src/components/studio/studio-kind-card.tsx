"use client";

import {
  AlertCircle,
  Check,
  Eye,
  Loader2,
  PencilLine,
  RotateCcw,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KIND_META } from "@/components/studio/studio-meta";
import type {
  AiDraft,
  CharacterDraft,
  PromptDraft,
  StyleDraft,
  ThemeDraft,
  WorldbookDraft,
} from "@/lib/ai/drafts";
import type { AiKind } from "@/lib/ai/kinds";
import type { StudioKindStatus } from "@/lib/types/studio";

function draftSummary(kind: AiKind, draft: AiDraft) {
  switch (kind) {
    case "character": {
      const data = draft as CharacterDraft;
      return {
        title: data.name,
        detail: data.tagline || "已生成角色卡",
      };
    }
    case "worldbook": {
      const data = draft as WorldbookDraft;
      return {
        title: data.name,
        detail: `${data.entries.length} 个条目 · 预算 ${
          data.tokenBudget ?? 2048
        } tokens`,
      };
    }
    case "prompt": {
      const data = draft as PromptDraft;
      return {
        title: data.name,
        detail: `${data.blocks?.length ?? 0} 个提示词块`,
      };
    }
    case "style": {
      const data = draft as StyleDraft;
      const config = data.config ?? {};
      const interaction = [
        config.showStatusTags ? "状态" : "",
        config.showGoal ? "目标" : "",
        config.showReplyOptions ? "选项" : "",
      ]
        .filter(Boolean)
        .join("/");
      return {
        title: data.name,
        detail: `${config.layout ?? "bubble"} · ${
          config.fontSize ?? 16
        }px · 行高 ${config.lineHeight ?? 1.8}${
          interaction ? ` · 互动增强 ${interaction}` : ""
        }`,
      };
    }
    case "theme": {
      const data = draft as ThemeDraft;
      return {
        title: data.name,
        detail: `${
          data.mode === "light"
            ? "浅色"
            : data.mode === "dark"
              ? "深色"
              : "通用"
        } · ${Object.keys(data.tokens).length} 个变量`,
      };
    }
  }
}

function StatusBadge({ status }: { status: StudioKindStatus }) {
  if (status.status === "running") {
    return (
      <Badge>
        <Loader2 className="size-3 animate-spin" />
        生成中
      </Badge>
    );
  }
  if (status.status === "queued") {
    return <Badge variant="secondary">排队中</Badge>;
  }
  if (status.status === "done") {
    return (
      <Badge variant="secondary">
        <Check className="size-3" />
        已生成
      </Badge>
    );
  }
  if (status.status === "error") {
    return (
      <Badge variant="destructive">
        <AlertCircle className="size-3" />
        失败
      </Badge>
    );
  }
  return <Badge variant="outline">待生成</Badge>;
}

export function StudioKindCard({
  kind,
  draft,
  status,
  disabled,
  onView,
  onRegenerate,
  onEditPrompt,
}: {
  kind: AiKind;
  draft?: AiDraft;
  status: StudioKindStatus;
  disabled?: boolean;
  onView: () => void;
  onRegenerate: () => void;
  onEditPrompt: () => void;
}) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const summary = draft ? draftSummary(kind, draft) : null;

  return (
    <div className="flex flex-col rounded-2xl border border-border/60 bg-card/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Icon className="size-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-sm font-medium">{meta.label}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {meta.description}
            </p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-3 min-h-12 flex-1">
        {summary ? (
          <div>
            <p className="truncate text-xs font-medium">{summary.title}</p>
            <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground">
              {summary.detail}
            </p>
          </div>
        ) : status.status === "queued" ? (
          <p className="text-[11px] text-muted-foreground">等待生成…</p>
        ) : status.status === "running" ? (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Loader2 className="size-3 animate-spin" />
            {status.step ?? "正在生成…"}
          </p>
        ) : status.status === "error" ? (
          <p className="line-clamp-3 text-[11px] leading-relaxed text-destructive">
            {status.error ?? "生成失败"}
          </p>
        ) : (
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            点击下方「重生成」单独生成这一项。
          </p>
        )}

        {summary && status.status === "error" && (
          <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-destructive">
            {status.error ?? "生成失败"}
          </p>
        )}

        {status.step && status.status === "running" && summary && (
          <p className="mt-1.5 text-[10px] text-muted-foreground">
            {status.step}
          </p>
        )}

        {status.warnings && status.warnings.length > 0 && (
          <ul className="mt-2 space-y-1">
            {status.warnings.map((warning) => (
              <li
                key={warning}
                className="flex items-start gap-1 text-[10px] leading-relaxed text-amber-600 dark:text-amber-400"
              >
                <AlertCircle className="mt-0.5 size-3 shrink-0" />
                {warning}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onView}
          disabled={!draft}
          className="rounded-lg"
        >
          <Eye data-icon="inline-start" />
          查看
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={disabled}
          className="rounded-lg"
        >
          <RotateCcw data-icon="inline-start" />
          重生成
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEditPrompt}
          disabled={disabled}
          className="rounded-lg"
        >
          <PencilLine data-icon="inline-start" />
          改提示词
        </Button>
      </div>
    </div>
  );
}
