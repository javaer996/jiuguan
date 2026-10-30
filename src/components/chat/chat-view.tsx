"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Brain,
  Bug,
  Send,
  Settings2,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import {
  ChatReplyOptions,
  ChatStatusStrip,
} from "@/components/chat/chat-aids";
import { ChatDebugDialog } from "@/components/chat/chat-debug-dialog";
import { ChatMemoryDialog } from "@/components/chat/chat-memory-dialog";
import { ChatMessage } from "@/components/chat/chat-message";
import { ChatSettingsDialog } from "@/components/chat/chat-settings-dialog";
import { useShellTheme } from "@/components/layout/shell-theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatAidOption, ChatAids } from "@/db/schema/types";
import { resolveAidsConfig } from "@/lib/chat/aids-config";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { readSse } from "@/lib/client/sse";
import { sanitizeCustomCssSafe } from "@/lib/css/sanitize";
import {
  sanitizeThemeBackgroundUrlSafe,
  sanitizeThemeTokensSafe,
  themeTokensToStyle,
} from "@/lib/theme/tokens";
import type { ChatDetailDTO, ChatMessageDTO } from "@/lib/types/chat";
import { initials } from "@/lib/utils";

let pendingCounter = 0;

function makePendingUser(
  content: string,
  parentId: string | null,
): ChatMessageDTO {
  pendingCounter += 1;
  return {
    id: `pending-${pendingCounter}`,
    role: "user",
    content,
    rawContent: null,
    structured: null,
    status: "complete",
    parentId,
    activeChildId: null,
    metadata: null,
    tokensIn: null,
    tokensOut: null,
    createdAt: new Date().toISOString(),
    siblingIds: [],
    siblingIndex: 0,
  };
}

function streamingMessage(content: string): ChatMessageDTO {
  return {
    id: "streaming",
    role: "assistant",
    content,
    rawContent: null,
    structured: null,
    status: "streaming",
    parentId: null,
    activeChildId: null,
    metadata: null,
    tokensIn: null,
    tokensOut: null,
    createdAt: new Date().toISOString(),
    siblingIds: [],
    siblingIndex: 0,
  };
}

export function ChatView({
  initial,
  isAdmin,
}: {
  initial: ChatDetailDTO;
  isAdmin: boolean;
}) {
  const [detail, setDetail] = useState(initial);
  const [composer, setComposer] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [pendingUser, setPendingUser] = useState<ChatMessageDTO | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [aidsLoading, setAidsLoading] = useState(false);
  const [aidsError, setAidsError] = useState<string | null>(null);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);
  const aidsRequestRef = useRef(new Set<string>());
  const aidsInFlightRef = useRef(false);
  const { setTheme: setShellTheme } = useShellTheme();

  const session = detail.session;
  const characterName = detail.character?.name ?? "酒馆";
  const userName = detail.persona?.name ?? "你";
  const lastMessage = detail.messages.at(-1);
  const lastAssistantId =
    lastMessage?.role === "assistant" ? lastMessage.id : null;
  const customCss = useMemo(() => {
    const themeCss = sanitizeCustomCssSafe(detail.theme?.customCss);
    const styleCss = sanitizeCustomCssSafe(detail.style?.customCss);
    return [themeCss, styleCss].filter(Boolean).join("\n");
  }, [detail.style?.customCss, detail.theme?.customCss]);
  const themeTokens = useMemo(
    () => sanitizeThemeTokensSafe(detail.theme?.tokens),
    [detail.theme?.tokens],
  );
  const themeStyle = useMemo(
    () => themeTokensToStyle(detail.theme?.tokens),
    [detail.theme?.tokens],
  );
  const themeBackground = useMemo(
    () => sanitizeThemeBackgroundUrlSafe(detail.theme?.backgroundUrl),
    [detail.theme?.backgroundUrl],
  );
  const contentWidth = detail.style?.config?.maxWidth ?? 860;
  const aidsConfig = useMemo(
    () => resolveAidsConfig(detail.style?.config),
    [detail.style?.config],
  );
  const aidsEnabled =
    aidsConfig.enabledStatus ||
    aidsConfig.enabledGoal ||
    aidsConfig.enabledOptions;
  const latestAssistant =
    lastMessage?.role === "assistant" && lastMessage.status === "complete"
      ? lastMessage
      : null;
  const latestAidsMessage = [...detail.messages]
    .reverse()
    .find(
      (message) =>
        message.role === "assistant" &&
        message.status === "complete" &&
        message.metadata?.aids,
    );
  const statusAids: ChatAids | undefined =
    latestAssistant?.metadata?.aids ?? latestAidsMessage?.metadata?.aids;
  const replyAids: ChatAids | undefined = latestAssistant?.metadata?.aids;

  useEffect(() => {
    setShellTheme(
      detail.theme
        ? { tokens: themeTokens, backgroundUrl: themeBackground }
        : null,
    );
  }, [detail.theme, themeTokens, themeBackground, setShellTheme]);

  useEffect(() => {
    return () => setShellTheme(null);
  }, [setShellTheme]);

  const requestAids = useCallback(
    async (
      messageId: string,
      force = false,
      scope: "all" | "options" = "all",
    ) => {
      if (aidsInFlightRef.current) return;
      aidsInFlightRef.current = true;
      if (scope === "options") {
        setOptionsLoading(true);
        setOptionsError(null);
      } else {
        setAidsLoading(true);
        setAidsError(null);
        setOptionsError(null);
      }
      try {
        const data = await apiFetch<{ aids: ChatAids }>(
          `/api/chats/${session.id}/aids`,
          {
            method: "POST",
            body: JSON.stringify({ messageId, force, scope }),
          },
        );
        setDetail((previous) => ({
          ...previous,
          messages: previous.messages.map((message) =>
            message.id === messageId
              ? {
                  ...message,
                  metadata: {
                    ...(message.metadata ?? {}),
                    aids: data.aids,
                  },
                }
              : message,
          ),
        }));
      } catch (error) {
        const message =
          error instanceof ApiClientError
            ? error.message
            : scope === "options"
              ? "回复选项生成失败，请稍后重试"
              : "互动信息生成失败，请稍后重试";
        if (scope === "options") {
          setOptionsError(message);
        } else {
          setAidsError(message);
        }
      } finally {
        aidsInFlightRef.current = false;
        if (scope === "options") {
          setOptionsLoading(false);
        } else {
          setAidsLoading(false);
        }
      }
    },
    [session.id],
  );

  useEffect(() => {
    if (
      !aidsEnabled ||
      streaming ||
      aidsLoading ||
      optionsLoading ||
      !latestAssistant
    ) {
      return;
    }
    if (latestAssistant.metadata?.aids?.configKey === aidsConfig.key) return;
    // 开场白是静态插入的，没有对应的主回复调用；为它单独生成会多一次请求。
    // 等用户发出第一条消息后，状态和选项会随主回复一起返回。
    if (latestAssistant.metadata?.greeting) return;

    const key = `${latestAssistant.id}:${aidsConfig.key}`;
    if (aidsRequestRef.current.has(key)) return;
    aidsRequestRef.current.add(key);
    void requestAids(latestAssistant.id);
  }, [
    aidsEnabled,
    aidsConfig.key,
    aidsLoading,
    latestAssistant,
    optionsLoading,
    requestAids,
    streaming,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [detail.messages.length, streamText, pendingUser]);

  async function refresh() {
    const data = await apiFetch<ChatDetailDTO>(`/api/chats/${session.id}`);
    setDetail(data);
  }

  async function consumeStream(response: Response) {
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      throw new Error(payload?.error?.message ?? "发送失败");
    }

    for await (const event of readSse(response)) {
      if (event.event === "delta") {
        const data = JSON.parse(event.data) as { content?: string };
        if (data.content) {
          setStreamText((previous) => previous + data.content);
        }
      } else if (event.event === "error") {
        const data = JSON.parse(event.data) as { message?: string };
        throw new Error(data.message ?? "生成失败");
      }
    }
  }

  async function handleSend() {
    const content = composer.trim();
    if (!content || streaming) return;

    setComposer("");
    setStreaming(true);
    setStreamText("");
    setAidsError(null);
    setOptionsError(null);
    setPendingUser(makePendingUser(content, session.activeLeafId));

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`/api/chats/${session.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        signal: controller.signal,
      });
      await consumeStream(response);
      await refresh();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.message("已停止生成");
      } else {
        toast.error(error instanceof Error ? error.message : "发送失败");
      }
      await refresh().catch(() => {});
    } finally {
      setStreaming(false);
      setStreamText("");
      setPendingUser(null);
      abortRef.current = null;
    }
  }

  async function handleRegenerate(messageId: string) {
    if (streaming) return;
    setStreaming(true);
    setStreamText("");
    setAidsError(null);
    setOptionsError(null);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`/api/chats/${session.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId }),
        signal: controller.signal,
      });
      await consumeStream(response);
      await refresh();
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        toast.message("已停止生成");
      } else {
        toast.error(error instanceof Error ? error.message : "重新生成失败");
      }
      await refresh().catch(() => {});
    } finally {
      setStreaming(false);
      setStreamText("");
      abortRef.current = null;
    }
  }

  async function handleActivate(messageId: string) {
    if (streaming) return;
    try {
      const data = await apiFetch<ChatDetailDTO>(
        `/api/chats/${session.id}/messages/${messageId}/activate`,
        { method: "POST" },
      );
      setDetail(data);
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "切换分支失败",
      );
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function handlePickOption(option: ChatAidOption) {
    setComposer(option.text);
    window.requestAnimationFrame(() => {
      const element = composerRef.current;
      if (!element) return;
      element.focus();
      element.setSelectionRange(element.value.length, element.value.length);
      element.scrollTop = element.scrollHeight;
    });
  }

  return (
    <div
      className="zy-chat relative isolate flex h-[calc(100dvh-4rem)] flex-col bg-background font-sans text-foreground lg:h-dvh"
      style={themeStyle}
    >
      {themeBackground && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url("${themeBackground}")` }}
        />
      )}
      {themeBackground && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-background/85 backdrop-blur-sm"
        />
      )}
      {customCss && <style>{customCss}</style>}
      <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-3 backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Button asChild variant="ghost" size="icon" className="rounded-xl">
            <Link href="/chats" aria-label="返回会话列表">
              <ArrowLeft />
            </Link>
          </Button>
          <Avatar className="size-9 rounded-xl">
            {detail.character?.avatarUrl && (
              <AvatarImage src={detail.character.avatarUrl} alt="" />
            )}
            <AvatarFallback className="rounded-xl bg-primary/12 font-display text-xs text-primary">
              {initials(characterName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h1 className="truncate font-display text-sm font-medium sm:text-base">
              {session.title}
            </h1>
            <p className="truncate text-[10px] text-muted-foreground">
              {characterName}
              {detail.provider
                ? ` · ${session.model ?? detail.provider.model}`
                : " · 未配置供应商"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Badge
            variant="outline"
            className="hidden border-border/60 px-2 py-0 text-[10px] font-normal text-muted-foreground sm:inline-flex"
          >
            {session.messageCount} 条
          </Badge>
          {isAdmin && session.settings?.debugMode === true && (
            <Button
              variant="ghost"
              size="icon"
              className="rounded-xl"
              onClick={() => setDebugOpen(true)}
              aria-label="最新请求调试"
              title="最新请求调试"
            >
              <Bug />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => setMemoryOpen(true)}
            aria-label="记忆与压缩"
          >
            <Brain />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => setSettingsOpen(true)}
            aria-label="对话设置"
          >
            <Settings2 />
          </Button>
        </div>
      </header>

      {!detail.provider && (
        <div className="flex items-center justify-center gap-2 border-b border-amber-500/20 bg-amber-500/[0.06] px-4 py-2 text-[11px] text-amber-500">
          <AlertTriangle className="size-3.5" />
          还没有可用的 AI 供应商，
          <Link href="/settings" className="underline underline-offset-4">
            去设置里接入
          </Link>
        </div>
      )}

      {(aidsConfig.enabledStatus || aidsConfig.enabledGoal) &&
        (latestAssistant || statusAids) && (
          <div className="shrink-0 border-b border-border/40 bg-background/70 px-3 py-2 backdrop-blur-md sm:px-5">
            <div className="mx-auto w-full" style={{ maxWidth: contentWidth }}>
              <ChatStatusStrip
                status={
                  aidsConfig.enabledStatus ? statusAids?.status : undefined
                }
                goal={aidsConfig.enabledGoal ? statusAids?.goal : undefined}
                notes={
                  aidsConfig.enabledStatus
                    ? aidsConfig.statusTagNotes
                    : undefined
                }
                loading={aidsLoading}
                error={aidsError}
                onRetry={
                  latestAssistant
                    ? () => void requestAids(latestAssistant.id, true)
                    : undefined
                }
              />
            </div>
          </div>
        )}

      <div className="flex-1 overflow-y-auto">
        <div
          className="mx-auto flex w-full flex-col gap-5 px-4 py-6 sm:px-6"
          style={{ maxWidth: contentWidth }}
        >
          {detail.messages.length === 0 && !pendingUser && (
            <div className="py-16 text-center">
              <p className="font-display text-lg text-muted-foreground">
                故事还没有开始
              </p>
              <p className="mt-2 text-xs text-muted-foreground/80">
                说点什么，让{characterName}回应你。
              </p>
            </div>
          )}

          {detail.messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              characterName={characterName}
              characterAvatar={detail.character?.avatarUrl}
              userName={userName}
              userAvatar={detail.persona?.avatarUrl}
              styleConfig={detail.style?.config}
              schema={detail.schema}
              showRegenerate={
                message.id === lastAssistantId && !streaming
              }
              onRegenerate={() => void handleRegenerate(message.id)}
              onActivateSibling={(id) => void handleActivate(id)}
            />
          ))}

          {pendingUser && (
            <ChatMessage
              message={pendingUser}
              characterName={characterName}
              characterAvatar={detail.character?.avatarUrl}
              userName={userName}
              userAvatar={detail.persona?.avatarUrl}
              styleConfig={detail.style?.config}
              schema={detail.schema}
            />
          )}

          {streaming && (
            <ChatMessage
              message={streamingMessage(streamText)}
              characterName={characterName}
              characterAvatar={detail.character?.avatarUrl}
              userName={userName}
              userAvatar={detail.persona?.avatarUrl}
              styleConfig={detail.style?.config}
              schema={detail.schema}
              streaming
            />
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="shrink-0 border-t border-border/60 bg-background/90 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-xl sm:px-5">
        <div
          className="mx-auto w-full space-y-2"
          style={{ maxWidth: contentWidth }}
        >
          {aidsConfig.enabledOptions &&
            latestAssistant &&
            !streaming &&
            !pendingUser && (
              <ChatReplyOptions
                options={replyAids?.options}
                loading={aidsLoading || optionsLoading}
                error={optionsError}
                onPick={handlePickOption}
                onRetry={() =>
                  void requestAids(latestAssistant.id, true, "options")
                }
              />
            )}

          <div className="flex w-full items-end gap-2">
            <Textarea
              ref={composerRef}
              value={composer}
              rows={1}
              placeholder={`对${characterName}说点什么…`}
              className="max-h-40 min-h-11 resize-none rounded-xl border-border/70 bg-card/85 py-3 dark:bg-card/85"
              onChange={(event) => setComposer(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
            />
            {streaming ? (
              <Button
                variant="outline"
                size="icon"
                className="size-11 shrink-0 rounded-xl"
                onClick={stop}
                aria-label="停止生成"
              >
                <Square className="size-4" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="size-11 shrink-0 rounded-xl shadow-glow"
                onClick={() => void handleSend()}
                disabled={!composer.trim()}
                aria-label="发送"
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
          <p className="text-center text-[10px] text-muted-foreground/50">
            Enter 发送 · Shift + Enter 换行 · 故事由你与角色共同写成
          </p>
        </div>
      </div>

      {settingsOpen && (
        <ChatSettingsDialog
          key={`${session.id}-${session.updatedAt}`}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          detail={detail}
          isAdmin={isAdmin}
          onSaved={refresh}
        />
      )}

      {debugOpen && (
        <ChatDebugDialog
          open={debugOpen}
          onOpenChange={setDebugOpen}
          sessionId={session.id}
        />
      )}

      {memoryOpen && (
        <ChatMemoryDialog
          key={`${session.id}-${session.updatedAt}`}
          open={memoryOpen}
          onOpenChange={setMemoryOpen}
          session={session}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
