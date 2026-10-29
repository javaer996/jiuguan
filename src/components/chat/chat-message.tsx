"use client";

import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { Markdown } from "@/components/chat/markdown";
import { StructuredContent } from "@/components/chat/structured-content";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { OutputSchemaSnapshot, StyleConfig } from "@/db/schema/types";
import { STYLE_PRESETS } from "@/lib/content/defaults";
import type { ChatMessageDTO } from "@/lib/types/chat";
import { cn, initials, withAlpha } from "@/lib/utils";

const DEFAULT_CONFIG = STYLE_PRESETS[0]!.config;

export function ChatMessage({
  message,
  characterName,
  characterAvatar,
  userName,
  userAvatar,
  styleConfig,
  schema,
  streaming,
  showRegenerate,
  onRegenerate,
  onActivateSibling,
}: {
  message: ChatMessageDTO;
  characterName: string;
  characterAvatar?: string | null;
  userName: string;
  userAvatar?: string | null;
  styleConfig?: StyleConfig | null;
  schema: OutputSchemaSnapshot | null;
  streaming?: boolean;
  showRegenerate?: boolean;
  onRegenerate?: () => void;
  onActivateSibling?: (id: string) => void;
}) {
  const config = { ...DEFAULT_CONFIG, ...(styleConfig ?? {}) };
  const layout = config.layout ?? "bubble";
  const accent = config.accentColor || null;
  const isUser = message.role === "user";
  const isNote = message.role === "note" || message.role === "system";
  const isAssistant = message.role === "assistant";
  const compact = layout === "messenger";
  const bubble = layout === "bubble" || layout === "messenger";
  const showAvatar = Boolean(config.showAvatars) && !isNote;

  if (isNote) {
    return (
      <div className="zy-note flex justify-center py-2">
        <p className="max-w-xl rounded-full bg-secondary/70 px-3 py-1 text-center text-[11px] leading-relaxed text-muted-foreground">
          {message.content}
        </p>
      </div>
    );
  }

  const name = isUser ? userName : characterName;
  const avatarUrl = isUser ? userAvatar : characterAvatar;

  const content = streaming ? (
    message.content ? (
      schema ? (
        <pre className="max-h-48 overflow-hidden font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
          {message.content}
        </pre>
      ) : (
        <Markdown
          content={message.content}
          narrationQuotes={config.narrationQuotes}
          narrationColor={config.narrationColor}
        />
      )
    ) : (
      <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
        <span className="flex gap-1">
          <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.2s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.1s]" />
          <span className="size-1.5 animate-bounce rounded-full bg-primary/70" />
        </span>
        {schema ? "正在组织结构化回复…" : "正在酝酿回复…"}
      </span>
    )
  ) : message.structured != null ? (
    <StructuredContent structured={message.structured} schema={schema} />
  ) : (
    <Markdown
      content={message.content}
      narrationQuotes={config.narrationQuotes}
      narrationColor={config.narrationColor}
    />
  );

  return (
    <div
      className={cn(
        "zy-message group/message flex w-full gap-3",
        isUser ? "zy-message-user" : "zy-message-assistant",
        isUser
          ? layout === "bubble" || layout === "messenger"
            ? "flex-row-reverse"
            : "justify-end"
          : "justify-start",
        compact && "gap-2",
      )}
      style={{ maxWidth: config.maxWidth ?? 860 }}
    >
      {showAvatar && (
        <Avatar
          className={cn(
            "zy-avatar mt-1 shrink-0 rounded-xl ring-1 ring-border/50",
            compact ? "size-7" : "size-9",
          )}
        >
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback
            className={cn(
              "rounded-xl font-display text-xs backdrop-blur-sm",
              isUser
                ? "bg-secondary/90 text-muted-foreground"
                : "bg-card/90 text-primary",
            )}
          >
            {initials(name)}
          </AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          "min-w-0",
          isUser ? "items-end text-right" : "items-start",
          "flex flex-col",
          layout === "document" && "w-full",
        )}
      >
        {!compact && !bubble && (
          <p className="zy-name mb-1 text-[10px] tracking-[0.16em] text-muted-foreground/80 uppercase">
            {name}
          </p>
        )}

        <div
          className={cn(
            "zy-content relative text-left transition-colors",
            bubble && "zy-bubble border px-4 py-2.5",
            bubble &&
              (isUser
                ? "border-primary/20 bg-primary/[0.08]"
                : "border-primary/25 bg-card/80 backdrop-blur-sm"),
            layout === "novel" && "zy-novel border-l-2 border-primary/45",
            layout === "document" &&
              "zy-document w-full rounded-xl border border-border/50 bg-card/75 px-5 py-4 shadow-soft backdrop-blur-sm",
            bubble && (compact ? "rounded-xl" : "rounded-2xl"),
            !bubble && layout !== "document" && "px-0 py-1",
          )}
          style={{
            background: bubble
              ? (isUser ? config.userBubble : config.assistantBubble) || undefined
              : undefined,
            borderColor:
              accent && bubble
                ? withAlpha(accent, isUser ? 0.18 : 0.24)
                : accent && layout === "document"
                  ? withAlpha(accent, 0.2)
                  : undefined,
            borderLeft:
              layout === "novel" && accent
                ? `2px solid ${withAlpha(accent, 0.45) ?? accent}`
                : undefined,
            paddingLeft: layout === "novel" ? 14 : undefined,
            fontSize: config.fontSize ?? 16,
            lineHeight: config.lineHeight ?? 1.8,
            fontFamily: config.fontFamily || undefined,
          }}
        >
          {content}
          {streaming && message.content && (
            <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-primary/70" />
          )}
        </div>

        <div
          className={cn(
            "zy-meta mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/80",
            isUser ? "flex-row-reverse" : "",
          )}
        >
          {config.showTimestamps && !streaming && (
            <span>
              {new Intl.DateTimeFormat("zh-CN", {
                hour: "2-digit",
                minute: "2-digit",
              }).format(new Date(message.createdAt))}
            </span>
          )}
          {isAssistant &&
            message.metadata?.worldbookHits &&
            message.metadata.worldbookHits.length > 0 && (
              <span title={message.metadata.worldbookHits.map((hit) => hit.name).join("、")}>
                世界书 {message.metadata.worldbookHits.length}
              </span>
            )}
          {isAssistant &&
            message.siblingIds.length > 1 &&
            onActivateSibling && (
              <span className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 rounded"
                  disabled={message.siblingIndex <= 0}
                  onClick={() =>
                    onActivateSibling(message.siblingIds[message.siblingIndex - 1]!)
                  }
                  aria-label="上一个分支"
                >
                  <ChevronLeft className="size-3" />
                </Button>
                <span className="tabular-nums">
                  {message.siblingIndex + 1}/{message.siblingIds.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-5 rounded"
                  disabled={message.siblingIndex >= message.siblingIds.length - 1}
                  onClick={() =>
                    onActivateSibling(message.siblingIds[message.siblingIndex + 1]!)
                  }
                  aria-label="下一个分支"
                >
                  <ChevronRight className="size-3" />
                </Button>
              </span>
            )}
          {isAssistant && showRegenerate && !streaming && onRegenerate && (
            <Button
              variant="ghost"
              size="icon"
              className="size-5 rounded opacity-0 transition-opacity group-hover/message:opacity-100"
              onClick={onRegenerate}
              aria-label="重新生成"
            >
              <RotateCcw className="size-3" />
            </Button>
          )}
        </div>

        {message.status === "error" && message.metadata?.error && (
          <p className="mt-1 flex items-center gap-1 text-[10px] text-destructive">
            <AlertTriangle className="size-3" />
            {message.metadata.error}
          </p>
        )}
        {message.status === "cancelled" && (
          <p className="mt-1 text-[10px] text-muted-foreground">已停止生成</p>
        )}
        {isAssistant &&
          message.metadata?.structuredValid === false &&
          message.metadata.schemaErrors &&
          message.metadata.schemaErrors.length > 0 && (
            <p className="mt-1 text-[10px] text-amber-500">
              结构化解析未完全通过：{message.metadata.schemaErrors[0]}
            </p>
          )}
      </div>
    </div>
  );
}
