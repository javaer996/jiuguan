"use client";

import { useEffect, useState } from "react";
import {
  Brain,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type {
  ChatCompressionDTO,
  ChatMemoryDTO,
  ChatMemoryKind,
  ChatMemoryStateDTO,
  ChatSessionDTO,
} from "@/lib/types/chat";
import { cn, formatRelativeTime } from "@/lib/utils";

const KIND_OPTIONS: { value: ChatMemoryKind; label: string; hint: string }[] = [
  { value: "permanent", label: "永久记忆", hint: "重要设定，始终注入" },
  { value: "note", label: "笔记", hint: "普通剧情笔记" },
  { value: "hidden", label: "隐藏记忆", hint: "注入但不希望显眼" },
];

const KIND_LABEL: Record<ChatMemoryKind, string> = {
  permanent: "永久",
  hidden: "隐藏",
  summary: "摘要",
  note: "笔记",
};

type MemoryForm = {
  kind: ChatMemoryKind;
  title: string;
  content: string;
  importance: number;
  enabled: boolean;
};

function emptyForm(): MemoryForm {
  return {
    kind: "note",
    title: "",
    content: "",
    importance: 1,
    enabled: true,
  };
}

export function ChatMemoryDialog({
  open,
  onOpenChange,
  session,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: ChatSessionDTO;
  onSaved: () => Promise<void> | void;
}) {
  const settings = session.settings ?? {};
  const [memories, setMemories] = useState<ChatMemoryDTO[]>([]);
  const [compression, setCompression] = useState<ChatCompressionDTO | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemoryForm>(emptyForm);
  const [memoryEnabled, setMemoryEnabled] = useState(
    settings.memoryEnabled !== false,
  );
  const [compressionEnabled, setCompressionEnabled] = useState(
    settings.compressionEnabled === true,
  );
  const [threshold, setThreshold] = useState(
    settings.compressionThreshold ?? 0.6,
  );
  const [keepRecent, setKeepRecent] = useState(
    settings.compressionKeepRecent ?? 12,
  );

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    apiFetch<ChatMemoryStateDTO>(`/api/chats/${session.id}/memories`)
      .then((data) => {
        if (cancelled) return;
        setMemories(data.memories);
        setCompression(data.compression);
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error(
          error instanceof ApiClientError ? error.message : "读取记忆失败",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, session.id]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function startEdit(memory: ChatMemoryDTO) {
    setEditingId(memory.id);
    setForm({
      kind: memory.kind,
      title: memory.title ?? "",
      content: memory.content,
      importance: memory.importance,
      enabled: memory.enabled,
    });
  }

  async function saveMemory() {
    if (saving) return;
    if (!form.content.trim()) {
      toast.error("先写一点记忆内容");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        kind: form.kind,
        title: form.title.trim() || null,
        content: form.content.trim(),
        importance: form.importance,
        enabled: form.enabled,
      };
      if (editingId) {
        const data = await apiFetch<{ memory: ChatMemoryDTO }>(
          `/api/chats/${session.id}/memories/${editingId}`,
          { method: "PATCH", body: JSON.stringify(payload) },
        );
        setMemories((previous) =>
          previous.map((memory) =>
            memory.id === editingId ? data.memory : memory,
          ),
        );
        toast.success("记忆已更新");
      } else {
        const data = await apiFetch<{ memory: ChatMemoryDTO }>(
          `/api/chats/${session.id}/memories`,
          { method: "POST", body: JSON.stringify(payload) },
        );
        setMemories((previous) => [data.memory, ...previous]);
        toast.success("记忆已保存");
      }
      resetForm();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "保存记忆失败",
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleMemory(memory: ChatMemoryDTO, enabled: boolean) {
    try {
      const data = await apiFetch<{ memory: ChatMemoryDTO }>(
        `/api/chats/${session.id}/memories/${memory.id}`,
        { method: "PATCH", body: JSON.stringify({ enabled }) },
      );
      setMemories((previous) =>
        previous.map((item) => (item.id === memory.id ? data.memory : item)),
      );
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "更新记忆失败",
      );
    }
  }

  async function deleteMemory(memory: ChatMemoryDTO) {
    try {
      await apiFetch(`/api/chats/${session.id}/memories/${memory.id}`, {
        method: "DELETE",
      });
      setMemories((previous) =>
        previous.filter((item) => item.id !== memory.id),
      );
      if (editingId === memory.id) resetForm();
      toast.success("记忆已删除");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "删除记忆失败",
      );
    }
  }

  async function saveSettings() {
    if (saving) return;
    setSaving(true);
    try {
      await apiFetch(`/api/chats/${session.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          settings: {
            ...settings,
            memoryEnabled,
            compressionEnabled,
            compressionThreshold: threshold,
            compressionKeepRecent: keepRecent,
          },
        }),
      });
      toast.success("记忆与压缩设置已保存");
      await onSaved();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "保存设置失败",
      );
    } finally {
      setSaving(false);
    }
  }

  async function compressNow() {
    if (compressing) return;
    setCompressing(true);
    try {
      const data = await apiFetch<{ compression: ChatCompressionDTO }>(
        `/api/chats/${session.id}/compress`,
        { method: "POST" },
      );
      setCompression(data.compression);
      toast.success("早期对话已压缩");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "压缩失败",
      );
    } finally {
      setCompressing(false);
    }
  }

  async function clearCompression() {
    if (clearing) return;
    setClearing(true);
    try {
      await apiFetch(`/api/chats/${session.id}/compress`, {
        method: "DELETE",
      });
      setCompression(null);
      toast.success("已清除摘要，后续会使用完整历史");
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "清除摘要失败",
      );
    } finally {
      setClearing(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Brain className="size-4 text-primary" />
            记忆与上下文压缩
          </DialogTitle>
          <DialogDescription>
            记忆会注入每次请求；压缩会把早期对话变成摘要，保留最近的消息。两者都只作用于当前会话。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <section className="rounded-2xl border border-border/60 bg-background/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-medium">注入设置</h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  自动压缩会在生成回复前调用当前供应商，产生额外 API 消耗。
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-lg"
                onClick={() => void saveSettings()}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <Save data-icon="inline-start" />
                )}
                保存设置
              </Button>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/25 px-3 py-2.5">
                <span className="text-xs">
                  注入长期记忆
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    关闭后记忆只保存、不发送给模型
                  </span>
                </span>
                <Switch
                  checked={memoryEnabled}
                  onCheckedChange={setMemoryEnabled}
                />
              </label>
              <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/25 px-3 py-2.5">
                <span className="text-xs">
                  自动压缩
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    上下文超过阈值时自动生成摘要
                  </span>
                </span>
                <Switch
                  checked={compressionEnabled}
                  onCheckedChange={setCompressionEnabled}
                />
              </label>
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <Label className="text-xs">触发阈值</Label>
                  <span className="text-[11px] text-muted-foreground">
                    {Math.round(threshold * 100)}%
                  </span>
                </div>
                <Input
                  type="range"
                  min={0.3}
                  max={0.95}
                  step={0.05}
                  value={threshold}
                  onChange={(event) =>
                    setThreshold(Number(event.target.value))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">保留最近消息</Label>
                <Input
                  type="number"
                  min={2}
                  max={100}
                  value={keepRecent}
                  onChange={(event) =>
                    setKeepRecent(
                      Math.min(
                        100,
                        Math.max(2, Number(event.target.value) || 12),
                      ),
                    )
                  }
                />
              </div>
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-sm font-medium">长期记忆</h3>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  重要度越高越先注入；单次最多使用约 1500 tokens。
                </p>
              </div>
              {editingId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-muted-foreground"
                  onClick={resetForm}
                >
                  <X data-icon="inline-start" />
                  取消编辑
                </Button>
              )}
            </div>

            <div className="mt-3 rounded-xl border border-border/60 bg-background/25 p-3.5">
              <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)_90px]">
                <div className="space-y-1.5">
                  <Label className="text-[11px]">类型</Label>
                  <Select
                    value={form.kind}
                    onValueChange={(value) =>
                      setForm((previous) => ({
                        ...previous,
                        kind: value as ChatMemoryKind,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">标题（可选）</Label>
                  <Input
                    value={form.title}
                    maxLength={160}
                    placeholder="例如：与船夫的约定"
                    onChange={(event) =>
                      setForm((previous) => ({
                        ...previous,
                        title: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[11px]">重要度</Label>
                  <Select
                    value={String(form.importance)}
                    onValueChange={(value) =>
                      setForm((previous) => ({
                        ...previous,
                        importance: Number(value),
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <SelectItem key={value} value={String(value)}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3 space-y-1.5">
                <Label className="text-[11px]">内容</Label>
                <Textarea
                  value={form.content}
                  rows={3}
                  maxLength={20_000}
                  placeholder="写下角色、关系、承诺或尚未解决的线索……"
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      content: event.target.value,
                    }))
                  }
                />
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-muted-foreground">
                  <Switch
                    checked={form.enabled}
                    onCheckedChange={(checked) =>
                      setForm((previous) => ({
                        ...previous,
                        enabled: checked,
                      }))
                    }
                  />
                  启用
                </label>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => void saveMemory()}
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                  ) : editingId ? (
                    <Save data-icon="inline-start" />
                  ) : (
                    <Plus data-icon="inline-start" />
                  )}
                  {editingId ? "保存修改" : "添加记忆"}
                </Button>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {loading ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  正在读取记忆…
                </p>
              ) : memories.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-xs text-muted-foreground">
                  还没有记忆。写下角色不会忘记的事。
                </p>
              ) : (
                memories.map((memory) => (
                  <div
                    key={memory.id}
                    className={cn(
                      "rounded-xl border p-3.5",
                      memory.enabled
                        ? "border-border/60 bg-card/30"
                        : "border-border/40 bg-background/20 opacity-60",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant="outline"
                        className="rounded-full px-2 py-0 text-[10px]"
                      >
                        {KIND_LABEL[memory.kind] ?? memory.kind}
                      </Badge>
                      <span className="truncate text-xs font-medium">
                        {memory.title || "未命名记忆"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        重要度 {memory.importance} ·{" "}
                        {formatRelativeTime(memory.updatedAt)}
                      </span>
                      <span className="ml-auto flex items-center gap-1">
                        <Switch
                          checked={memory.enabled}
                          onCheckedChange={(checked) =>
                            void toggleMemory(memory, checked)
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg"
                          onClick={() => startEdit(memory)}
                          aria-label="编辑记忆"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 rounded-lg text-muted-foreground hover:text-destructive"
                          onClick={() => void deleteMemory(memory)}
                          aria-label="删除记忆"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
                      {memory.content}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-background/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-1.5 font-display text-sm font-medium">
                  <Sparkles className="size-3.5 text-primary" />
                  上下文压缩
                </h3>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  摘要绑定当前分支，切换分支后不会串线。压缩失败时自动回退到截断。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => void compressNow()}
                  disabled={compressing}
                >
                  {compressing ? (
                    <Loader2
                      data-icon="inline-start"
                      className="animate-spin"
                    />
                  ) : (
                    <Sparkles data-icon="inline-start" />
                  )}
                  {compressing ? "正在压缩…" : "立即压缩"}
                </Button>
                {compression && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-lg"
                    onClick={() => void clearCompression()}
                    disabled={clearing}
                  >
                    {clearing ? (
                      <Loader2
                        data-icon="inline-start"
                        className="animate-spin"
                      />
                    ) : (
                      <Trash2 data-icon="inline-start" />
                    )}
                    清除摘要
                  </Button>
                )}
              </div>
            </div>

            {compression ? (
              <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[0.04] p-3.5">
                <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground/85">
                  {compression.summary}
                </p>
                <p className="mt-2 text-[10px] text-muted-foreground">
                  覆盖 {compression.messageCount ?? 0} 条消息 ·{" "}
                  {compression.tokensBefore ?? 0} →{" "}
                  {compression.tokensAfter ?? 0} tokens ·{" "}
                  {formatRelativeTime(compression.createdAt)}
                </p>
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed border-border/70 px-4 py-5 text-center text-[11px] text-muted-foreground">
                还没有摘要。至少需要比「保留最近消息」多出 4 条早期消息。
              </p>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
