"use client";

import type { CSSProperties } from "react";
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
import { applyChatVariables } from "@/lib/chat/variables";
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
  // 角色卡开场白与 AI 回复里常带 {{user}} / {{char}} 占位符，展示时替换成实际名称。
  const resolvedContent = applyChatVariables(message.content, {
    char: characterName,
    user: userName,
  });
  const bubble = layout === "bubble" || layout === "messenger";
  const showAvatar = Boolean(config.showAvatars) && !isNote;
  const showName =
    !isNote &&
    (layout === "novel" || layout === "document" || layout === "messenger");
  const dropCap = Boolean(config.dropCap) && isAssistant;
  const sideAccent = isUser
    ? config.userAccentColor || accent
    : config.assistantAccentColor || accent;
  const sideTextColor = isUser
    ? config.userTextColor
    : config.assistantTextColor;
  const sideFontFamily = isUser
    ? config.userFontFamily || config.fontFamily
    : config.assistantFontFamily || config.fontFamily;
  const sideFontSize = isUser
    ? (config.userFontSize ?? config.fontSize ?? 16)
    : (config.assistantFontSize ?? config.fontSize ?? 16);
  const sideLineHeight = isUser
    ? (config.userLineHeight ?? config.lineHeight ?? 1.8)
    : (config.assistantLineHeight ?? config.lineHeight ?? 1.8);
  const timeLabel =
    config.showTimestamps && !streaming
      ? new Intl.DateTimeFormat("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date(message.createdAt))
      : null;

  if (isNote) {
    return (
      <div className="zy-note flex justify-center py-2">
        <p className="max-w-xl rounded-full bg-secondary/70 px-3 py-1 text-center text-[11px] leading-relaxed text-muted-foreground">
          {resolvedContent}
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
          {resolvedContent}
        </pre>
      ) : (
        <Markdown
          content={resolvedContent}
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
      content={resolvedContent}
      narrationQuotes={config.narrationQuotes}
      narrationColor={config.narrationColor}
    />
  );

  return (
    <div
      className={cn(
        "zy-message group/message flex w-full gap-3",
        `zy-layout-${layout}`,
        isUser ? "zy-message-user" : "zy-message-assistant",
        isUser
          ? layout === "bubble" || layout === "messenger"
            ? "flex-row-reverse"
            : "justify-end"
          : "justify-start",
        layout === "messenger" && "gap-2",
      )}
      style={
        {
          maxWidth: config.maxWidth ?? 860,
          "--zy-accent": sideAccent ?? undefined,
        } as CSSProperties
      }
    >
      {showAvatar && (
        <Avatar
          className={cn(
            "zy-avatar mt-1 shrink-0 ring-1 ring-border/50",
            layout === "messenger" ? "size-7 rounded-lg" : "size-9 rounded-xl",
          )}
        >
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback
            className={cn(
              "font-display text-xs backdrop-blur-sm",
              layout === "messenger" ? "rounded-lg text-[10px]" : "rounded-xl",
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
        {showName && (
          <p className="zy-name mb-1 text-[10px] tracking-[0.16em] text-muted-foreground/80 uppercase">
            <span>{name}</span>
            {layout === "messenger" && timeLabel && (
              <span className="ml-1.5 text-[9px] tracking-normal text-muted-foreground/50">
                {timeLabel}
              </span>
            )}
          </p>
        )}

        <div
          className={cn(
            "zy-content relative text-left",
            layout === "bubble" &&
              cn(
                "zy-bubble rounded-2xl border px-4 py-2.5",
                isUser
                  ? "zy-bubble-user border-primary/20 bg-primary/[0.08]"
                  : "zy-bubble-assistant border-primary/25 bg-card/80 backdrop-blur-sm",
              ),
            layout === "messenger" &&
              cn(
                "zy-bubble zy-messenger rounded-xl border px-3.5 py-2 text-[0.94em]",
                isUser
                  ? "zy-bubble-user border-primary/25 bg-primary/[0.12]"
                  : "zy-bubble-assistant border-border/60 bg-card/85",
              ),
            layout === "novel" && "zy-novel",
            layout === "novel" && isUser && "zy-novel-user",
            layout === "document" && "zy-document w-full",
            layout === "document" && isUser && "zy-document-note",
            dropCap && "zy-dropcap",
            dropCap &&
              config.dropCapEffect === "gradient" &&
              "zy-dropcap-gradient",
            dropCap && config.dropCapEffect === "glow" && "zy-dropcap-glow",
            !bubble && layout !== "document" && "px-0 py-1",
          )}
          style={
            {
              background: bubble
                ? (isUser ? config.userBubble : config.assistantBubble) ||
                  undefined
                : undefined,
              borderColor: sideAccent
                ? bubble
                  ? withAlpha(sideAccent, isUser ? 0.18 : 0.24)
                  : layout === "document"
                    ? withAlpha(sideAccent, 0.28)
                    : undefined
                : undefined,
              color: sideTextColor || undefined,
              ...(dropCap
                ? {
                    "--zy-dropcap-color":
                      config.dropCapColor || sideAccent || undefined,
                    "--zy-dropcap-size": `${(sideLineHeight * 2).toFixed(2)}em`,
                  }
                : {}),
              fontSize: sideFontSize,
              lineHeight: sideLineHeight,
              fontFamily: sideFontFamily || undefined,
            } as CSSProperties
          }
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
          {config.showTimestamps && !streaming && layout !== "messenger" && (
            <span>{timeLabel}</span>
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
