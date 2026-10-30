"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Bug,
  Copy,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type { ChatDebugSnapshotDTO } from "@/lib/types/chat";

export function ChatDebugDialog({
  open,
  onOpenChange,
  sessionId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}) {
  const [snapshot, setSnapshot] = useState<ChatDebugSnapshotDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSnapshot = useCallback(
    () =>
      apiFetch<{ debug: ChatDebugSnapshotDTO | null }>(
        `/api/chats/${sessionId}/debug`,
      ),
    [sessionId],
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchSnapshot()
      .then((data) => {
        if (!cancelled) setSnapshot(data.debug);
      })
      .catch((cause) => {
        if (cancelled) return;
        setError(
          cause instanceof ApiClientError
            ? cause.message
            : "读取调试信息失败",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, fetchSnapshot]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSnapshot();
      setSnapshot(data.debug);
    } catch (cause) {
      setError(
        cause instanceof ApiClientError ? cause.message : "读取调试信息失败",
      );
    } finally {
      setLoading(false);
    }
  }

  async function copy(label: string, text: string) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label}已复制`);
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  }

  const requestJson = snapshot?.request.body
    ? JSON.stringify(snapshot.request.body, null, 2)
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Bug className="size-4 text-amber-500" />
            最新请求调试
          </DialogTitle>
          <DialogDescription>
            仅管理员可见。只保留当前会话最近一次 AI 请求，不写入数据库；服务重启或切换进程后会清空。
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            正在读取调试信息…
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.04] p-3 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <div className="min-w-0">
              <p className="font-medium">读取失败</p>
              <p className="mt-1 break-words text-destructive/80">{error}</p>
            </div>
          </div>
        ) : !snapshot ? (
          <div className="rounded-2xl border border-dashed border-border/70 px-6 py-12 text-center">
            <Bug className="mx-auto size-8 text-muted-foreground/40" />
            <p className="mt-3 text-sm font-medium">还没有调试记录</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              先发送一条消息或重新生成一次回复，再回来查看。
              <br />
              这里只保留最近一次请求，不会保存历史。
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
              <Badge
                variant={
                  snapshot.status === "complete" ? "secondary" : "destructive"
                }
                className="h-5"
              >
                {snapshot.status === "complete" ? "已完成" : "失败"}
              </Badge>
              <span>{new Date(snapshot.completedAt).toLocaleString("zh-CN")}</span>
              <span>·</span>
              <span>
                {snapshot.request.providerName ?? "未知供应商"} /{" "}
                {snapshot.request.model}
              </span>
              <span>·</span>
              <span>{snapshot.response.latencyMs}ms</span>
              <span>·</span>
              <span>约 {snapshot.request.estimatedTokens} tokens</span>
              {snapshot.response.finishReason && (
                <>
                  <span>·</span>
                  <span>finish: {snapshot.response.finishReason}</span>
                </>
              )}
            </div>

            {snapshot.response.error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/[0.04] p-3 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">这次请求失败了</p>
                  <p className="mt-1 break-words text-destructive/80">
                    {snapshot.response.error}
                  </p>
                </div>
              </div>
            )}

            {snapshot.request.worldbookHits.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">
                  世界书命中：
                </span>
                {snapshot.request.worldbookHits.map((hit) => (
                  <Badge
                    key={`${hit.entryId}-${hit.name}`}
                    variant="outline"
                    className="h-5 rounded-md px-1.5 text-[10px] font-normal"
                  >
                    {hit.name} · {hit.tokens}t
                  </Badge>
                ))}
              </div>
            )}

            <Tabs defaultValue="request" className="min-h-0">
              <TabsList className="w-full">
                <TabsTrigger value="request">发送给 AI</TabsTrigger>
                <TabsTrigger value="response">AI 原始响应</TabsTrigger>
              </TabsList>

              <TabsContent value="request" className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    实际发送给供应商的 JSON body，不包含 API Key。
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => void copy("请求 JSON", requestJson)}
                    disabled={!requestJson}
                  >
                    <Copy data-icon="inline-start" />
                    复制 JSON
                  </Button>
                </div>

                {snapshot.request.messages.length > 0 && (
                  <details className="rounded-xl border border-border/60 bg-background/30">
                    <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground select-none">
                      按消息查看（{snapshot.request.messages.length} 条）
                    </summary>
                    <div className="max-h-[40dvh] space-y-2 overflow-y-auto border-t border-border/50 p-2">
                      {snapshot.request.messages.map((message, index) => (
                        <div
                          key={`${message.role}-${index}`}
                          className="rounded-lg border border-border/50 bg-card/30 p-2"
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="h-4 rounded px-1.5 text-[10px] font-normal"
                            >
                              {message.role}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              #{index + 1}
                            </span>
                          </div>
                          <pre className="font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
                            {message.content}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {requestJson ? (
                  <pre className="max-h-[50dvh] overflow-auto rounded-xl border border-border/60 bg-background/50 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                    {requestJson}
                  </pre>
                ) : (
                  <p className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3 text-xs text-amber-700 dark:text-amber-300">
                    请求在真正发出前就失败了，没有可展示的请求 body。
                  </p>
                )}
              </TabsContent>

              <TabsContent value="response" className="mt-3 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">
                    模型流式返回的原始文本，未解析、未剥离隐藏区块。
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() =>
                      void copy("原始响应", snapshot.response.raw)
                    }
                    disabled={!snapshot.response.raw}
                  >
                    <Copy data-icon="inline-start" />
                    复制响应
                  </Button>
                </div>

                <pre className="max-h-[50dvh] overflow-auto rounded-xl border border-border/60 bg-background/50 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                  {snapshot.response.raw || "（空）"}
                </pre>

                {snapshot.response.content &&
                  snapshot.response.content !== snapshot.response.raw && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground">
                        解析后内容（实际入库/展示）
                      </p>
                      <pre className="max-h-[35dvh] overflow-auto rounded-xl border border-border/60 bg-background/50 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-words">
                        {snapshot.response.content}
                      </pre>
                    </div>
                  )}

                {snapshot.response.usage && (
                  <p className="text-[11px] text-muted-foreground">
                    Token 用量：输入{" "}
                    {snapshot.response.usage.promptTokens ?? "-"} / 输出{" "}
                    {snapshot.response.usage.completionTokens ?? "-"} / 合计{" "}
                    {snapshot.response.usage.totalTokens ?? "-"}
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <RefreshCw />
            )}
            刷新
          </Button>
          <Button
            type="button"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
