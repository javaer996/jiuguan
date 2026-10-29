"use client";

import { useState, type FormEvent } from "react";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type { WorldbookDTO } from "@/lib/types/content";

type BookDraft = {
  name: string;
  description: string;
  scanDepth: number;
  tokenBudget: number;
  recursive: boolean;
  maxRecursionDepth: number;
  caseSensitive: boolean;
  matchWholeWords: boolean;
};

function toDraft(book: WorldbookDTO): BookDraft {
  return {
    name: book.name,
    description: book.description ?? "",
    scanDepth: book.scanDepth,
    tokenBudget: book.tokenBudget,
    recursive: book.recursive,
    maxRecursionDepth: book.maxRecursionDepth,
    caseSensitive: book.caseSensitive,
    matchWholeWords: book.matchWholeWords,
  };
}

function WorldbookSettingsForm({
  book,
  onSaved,
  onClose,
}: {
  book: WorldbookDTO;
  onSaved: (book: WorldbookDTO) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<BookDraft>(() => toDraft(book));
  const [saving, setSaving] = useState(false);

  function set<K extends keyof BookDraft>(key: K, value: BookDraft[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !draft.name.trim()) return;

    setSaving(true);
    try {
      const result = await apiFetch<{ worldbook: WorldbookDTO }>(
        `/api/worldbooks/${book.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            ...draft,
            name: draft.name.trim(),
            description: draft.description.trim() || null,
          }),
        },
      );
      toast.success("世界书设置已保存");
      onSaved(result.worldbook);
      onClose();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "保存失败，请稍后再试",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="book-name">名称</Label>
        <Input
          id="book-name"
          value={draft.name}
          onChange={(event) => set("name", event.target.value)}
          maxLength={80}
          className="h-10 rounded-xl"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="book-description">简介</Label>
        <Textarea
          id="book-description"
          value={draft.description}
          onChange={(event) => set("description", event.target.value)}
          className="min-h-20 rounded-xl"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">扫描深度</Label>
          <Input
            type="number"
            value={draft.scanDepth}
            min={0}
            max={50}
            onChange={(event) =>
              set("scanDepth", Number(event.target.value) || 0)
            }
            className="h-9 rounded-xl"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Token 预算</Label>
          <Input
            type="number"
            value={draft.tokenBudget}
            min={0}
            onChange={(event) =>
              set("tokenBudget", Number(event.target.value) || 0)
            }
            className="h-9 rounded-xl"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border/50 bg-background/30 px-3 py-2.5">
          <span>
            <span className="block text-xs font-medium">启用递归扫描</span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              被激活的条目可以继续触发其他条目。
            </span>
          </span>
          <Switch
            checked={draft.recursive}
            onCheckedChange={(checked) => set("recursive", checked)}
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border/50 bg-background/30 px-3 py-2.5">
          <span>
            <span className="block text-xs font-medium">区分大小写</span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              关键词匹配默认忽略大小写。
            </span>
          </span>
          <Switch
            checked={draft.caseSensitive}
            onCheckedChange={(checked) => set("caseSensitive", checked)}
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-border/50 bg-background/30 px-3 py-2.5">
          <span>
            <span className="block text-xs font-medium">全词匹配</span>
            <span className="mt-0.5 block text-[10px] text-muted-foreground">
              避免关键词命中更长的单词。
            </span>
          </span>
          <Switch
            checked={draft.matchWholeWords}
            onCheckedChange={(checked) => set("matchWholeWords", checked)}
          />
        </label>
      </div>

      {draft.recursive && (
        <div className="space-y-1.5">
          <Label className="text-xs">最大递归深度</Label>
          <Input
            type="number"
            value={draft.maxRecursionDepth}
            min={0}
            max={10}
            onChange={(event) =>
              set("maxRecursionDepth", Number(event.target.value) || 0)
            }
            className="h-9 rounded-xl"
          />
        </div>
      )}

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="rounded-xl"
        >
          取消
        </Button>
        <Button
          type="submit"
          disabled={saving || !draft.name.trim()}
          className="rounded-xl"
        >
          {saving && <Loader2 className="animate-spin" />}
          保存设置
        </Button>
      </DialogFooter>
    </form>
  );
}

export function WorldbookSettingsDialog({
  book,
  open,
  onOpenChange,
  onSaved,
}: {
  book: WorldbookDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (book: WorldbookDTO) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Settings2 className="size-4 text-primary" />
            世界书设置
          </DialogTitle>
          <DialogDescription>
            这些设置会影响整本世界书的扫描范围与注入预算。
          </DialogDescription>
        </DialogHeader>

        <WorldbookSettingsForm
          key={book.id}
          book={book}
          onSaved={onSaved}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
