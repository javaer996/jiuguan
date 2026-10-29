"use client";

import { useRef } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Target,
} from "lucide-react";
import type {
  ChatAidOption,
  ChatAidStatus,
} from "@/db/schema/types";
import { cn } from "@/lib/utils";

export function ChatStatusStrip({
  status,
  goal,
  notes,
  loading = false,
  error,
  onRetry,
  className,
}: {
  status?: ChatAidStatus[];
  goal?: string;
  notes?: Record<string, string>;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  className?: string;
}) {
  const hasContent = Boolean(status?.length || goal);
  if (!loading && !error && !hasContent) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]",
        className,
      )}
    >
      {status?.map((item) => (
        <span
          key={item.label}
          className="zy-aid-status inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-card/70 px-2.5 py-1 backdrop-blur-sm"
          title={notes?.[item.label]}
        >
          <span className="text-muted-foreground">{item.label}</span>
          <span className="font-medium text-foreground">{item.value}</span>
        </span>
      ))}

      {goal && (
        <span
          className="zy-aid-goal inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-primary/25 bg-primary/[0.06] px-2.5 py-1 backdrop-blur-sm"
          title={goal}
        >
          <Target className="size-3 shrink-0 text-primary" />
          <span className="shrink-0 text-muted-foreground">目标</span>
          <span className="truncate font-medium text-foreground">{goal}</span>
        </span>
      )}

      {loading && (
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          {hasContent ? "正在更新状态…" : "正在整理人物状态…"}
        </span>
      )}

      {error && (
        <button
          type="button"
          onClick={onRetry}
          disabled={!onRetry}
          title={error}
          className="inline-flex items-center gap-1.5 text-destructive hover:underline disabled:no-underline"
        >
          <RefreshCw className="size-3" />
          互动信息生成失败，点击重试
        </button>
      )}
    </div>
  );
}

function OptionCard({
  option,
  interactive,
  disabled,
  onPick,
  className,
}: {
  option: ChatAidOption;
  interactive: boolean;
  disabled: boolean;
  onPick?: (option: ChatAidOption) => void;
  className?: string;
}) {
  const content = (
    <>
      <span className="inline-flex rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-medium text-primary">
        {option.style}
      </span>
      <span className="mt-1.5 line-clamp-3 block text-xs leading-relaxed text-foreground">
        {option.text}
      </span>
      {interactive && (
        <ArrowUpRight className="absolute top-2.5 right-2.5 size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </>
  );

  const cardClassName = cn(
    "zy-aid-option relative min-w-0 rounded-xl border border-border/60 bg-card/75 p-3 text-left backdrop-blur-sm transition-all",
    interactive &&
      !disabled &&
      "group hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card/90 hover:shadow-soft",
    disabled && "pointer-events-none opacity-60",
    className,
  );

  if (!interactive) {
    return <div className={cardClassName}>{content}</div>;
  }

  return (
    <button
      type="button"
      className={cardClassName}
      onClick={() => onPick?.(option)}
      disabled={disabled}
      title={option.text}
    >
      {content}
    </button>
  );
}

export function ChatReplyOptions({
  options,
  loading = false,
  error,
  onPick,
  onRetry,
  compact = false,
  className,
}: {
  options?: ChatAidOption[];
  loading?: boolean;
  error?: string | null;
  onPick?: (option: ChatAidOption) => void;
  onRetry?: () => void;
  compact?: boolean;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hasOptions = Boolean(options?.length);
  const showScrollControls =
    !compact && !loading && (options?.length ?? 0) > 3;

  if (!loading && !error && !hasOptions) return null;

  function scrollOptions(direction: -1 | 1) {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollBy({
      left: direction * Math.max(240, element.clientWidth * 0.8),
      behavior: "smooth",
    });
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
          可选回复
        </p>
        <div className="flex items-center gap-2">
          {showScrollControls && (
            <div className="hidden items-center gap-0.5 sm:flex">
              <button
                type="button"
                aria-label="向左查看更多回复"
                onClick={() => scrollOptions(-1)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                <ChevronLeft className="size-3.5" />
              </button>
              <button
                type="button"
                aria-label="向右查看更多回复"
                onClick={() => scrollOptions(1)}
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                <ChevronRight className="size-3.5" />
              </button>
            </div>
          )}
          {onRetry && !loading && hasOptions && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <RefreshCw className="size-3" />
              换一组
            </button>
          )}
        </div>
      </div>

      {hasOptions ? (
        <div
          ref={scrollRef}
          className={cn(
            "gap-2",
            compact
              ? "grid"
              : // 超过三张时保持单行左右滑动，不再换行堆高消息区。
                "flex snap-x snap-mandatory overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
          aria-label={compact ? undefined : "回复选项，横向滑动查看更多"}
        >
          {options!.map((option, index) => (
            <OptionCard
              key={`${option.style}-${index}`}
              option={option}
              interactive={Boolean(onPick)}
              disabled={loading}
              onPick={onPick}
              className={
                compact
                  ? undefined
                  : "w-[82%] shrink-0 snap-start sm:w-[calc((100%-1rem)/3)]"
              }
            />
          ))}
        </div>
      ) : null}

      {loading && (
        <div
          className={cn(
            "gap-2",
            hasOptions
              ? "hidden"
              : compact
                ? "grid"
                : "flex overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
          aria-hidden
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={cn(
                "space-y-2 rounded-xl border border-border/50 bg-card/50 p-3",
                !compact &&
                  "w-[82%] shrink-0 sm:w-[calc((100%-1rem)/3)]",
              )}
            >
              <div className="h-4 w-12 animate-pulse rounded-full bg-primary/15" />
              <div className="h-3 w-full animate-pulse rounded bg-secondary/70" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-secondary/70" />
            </div>
          ))}
        </div>
      )}

      {loading && hasOptions && (
        <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          正在换一组回复…
        </p>
      )}

      {error && (
        <button
          type="button"
          onClick={onRetry}
          disabled={!onRetry}
          title={error}
          className="inline-flex items-center gap-1.5 text-[10px] text-destructive hover:underline disabled:no-underline"
        >
          <RefreshCw className="size-3" />
          回复选项生成失败，点击重试
        </button>
      )}
    </div>
  );
}
