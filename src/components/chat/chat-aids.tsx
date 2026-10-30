"use client";

import { useRef, useSyncExternalStore } from "react";
import {
  ArrowUpRight,
  ChevronDown,
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
      <span className="inline-flex rounded-full bg-primary/12 px-1.5 py-0.5 text-[9px] font-medium leading-none text-primary">
        {option.style}
      </span>
      <span className="mt-1 line-clamp-2 text-xs leading-snug text-foreground">
        {option.text}
      </span>
      {interactive && (
        <ArrowUpRight className="absolute top-2 right-2 size-3 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      )}
    </>
  );

  const cardClassName = cn(
    "zy-aid-option relative flex min-w-0 flex-col items-start rounded-xl border border-border/60 bg-card/75 px-2.5 py-2 text-left backdrop-blur-sm transition-colors",
    interactive &&
      !disabled &&
      "group cursor-pointer hover:border-primary/45 hover:bg-card/95 hover:shadow-soft focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-inset focus-visible:outline-none",
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

const REPLY_OPTIONS_COLLAPSED_KEY = "zy-reply-options-collapsed";
const REPLY_OPTIONS_CHANGE_EVENT = "zy-reply-options-change";
let collapsedMemory = false;

function subscribeReplyOptions(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(REPLY_OPTIONS_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(REPLY_OPTIONS_CHANGE_EVENT, callback);
  };
}

function getReplyOptionsCollapsed() {
  if (typeof window === "undefined") return false;
  try {
    const stored = window.localStorage.getItem(REPLY_OPTIONS_COLLAPSED_KEY);
    if (stored !== null) return stored === "1";
  } catch {
    // 隐私模式下 localStorage 不可用，退回内存状态。
  }
  return collapsedMemory;
}

function getReplyOptionsCollapsedServer() {
  return false;
}

function setReplyOptionsCollapsed(next: boolean) {
  collapsedMemory = next;
  try {
    window.localStorage.setItem(
      REPLY_OPTIONS_COLLAPSED_KEY,
      next ? "1" : "0",
    );
  } catch {
    // 隐私模式下无法持久化，只影响本次会话。
  }
  window.dispatchEvent(new Event(REPLY_OPTIONS_CHANGE_EVENT));
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
  const storedCollapsed = useSyncExternalStore(
    subscribeReplyOptions,
    getReplyOptionsCollapsed,
    getReplyOptionsCollapsedServer,
  );
  const hasOptions = Boolean(options?.length);
  const showScrollControls =
    !compact && !loading && (options?.length ?? 0) > 3;
  const collapsible = !compact;
  const collapsed = collapsible && storedCollapsed;
  const showBody = !collapsed;

  if (!loading && !error && !hasOptions) return null;

  function scrollOptions(direction: -1 | 1) {
    const element = scrollRef.current;
    if (!element) return;
    element.scrollBy({
      left: direction * Math.max(240, element.clientWidth * 0.8),
      behavior: "smooth",
    });
  }

  function toggleCollapsed() {
    setReplyOptionsCollapsed(!collapsed);
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-2">
        {collapsible ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            title={collapsed ? "展开可选回复" : "收起可选回复"}
            className="-m-1 inline-flex items-center gap-1 rounded-md p-1 text-[10px] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            <span>可选回复</span>
            {hasOptions && (
              <span className="tracking-normal text-muted-foreground/60">
                · {options!.length}
              </span>
            )}
            <ChevronDown
              className={cn(
                "size-3 transition-transform",
                !collapsed && "rotate-180",
              )}
            />
          </button>
        ) : (
          <p className="text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
            可选回复
          </p>
        )}
        <div className="flex items-center gap-2">
          {collapsed && loading && (
            <Loader2 className="size-3 animate-spin text-muted-foreground" />
          )}
          {showBody && showScrollControls && (
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
          {showBody && onRetry && !loading && hasOptions && (
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

      {showBody && hasOptions ? (
        <div
          ref={scrollRef}
          className={cn(
            "gap-2",
            compact
              ? "grid"
              : // 超过三张时保持单行左右滑动；上下留白避免悬停/聚焦边框被裁切。
                "flex snap-x snap-mandatory overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
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

      {showBody && loading && (
        <div
          className={cn(
            "gap-2",
            hasOptions
              ? "hidden"
              : compact
                ? "grid"
                : "flex overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          )}
          aria-hidden
        >
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={cn(
                "space-y-2 rounded-xl border border-border/50 bg-card/50 px-2.5 py-2",
                !compact &&
                  "w-[82%] shrink-0 sm:w-[calc((100%-1rem)/3)]",
              )}
            >
              <div className="h-3 w-10 animate-pulse rounded-full bg-primary/15" />
              <div className="h-3 w-full animate-pulse rounded bg-secondary/70" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-secondary/70" />
            </div>
          ))}
        </div>
      )}

      {showBody && loading && hasOptions && (
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
