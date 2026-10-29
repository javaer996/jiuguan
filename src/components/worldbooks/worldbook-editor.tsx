"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  BookOpen,
  Loader2,
  Plus,
  Search,
  Settings2,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/common/empty-state";
import { WorldbookEntryEditor } from "@/components/worldbooks/worldbook-entry-editor";
import { WorldbookSettingsDialog } from "@/components/worldbooks/worldbook-settings-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type {
  WorldbookDTO,
  WorldbookDetailDTO,
  WorldbookEntryDTO,
} from "@/lib/types/content";
import { cn } from "@/lib/utils";

export function WorldbookEditor({
  initial,
}: {
  initial: WorldbookDetailDTO;
}) {
  const router = useRouter();
  const [book, setBook] = useState<WorldbookDTO>(() => {
    const rest = { ...initial };
    delete (rest as Partial<WorldbookDetailDTO>).entries;
    return rest;
  });
  const [entries, setEntries] = useState<WorldbookEntryDTO[]>(initial.entries);
  const [selectedId, setSelectedId] = useState<string | null>(
    initial.entries[0]?.id ?? null,
  );
  const [filter, setFilter] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingBook, setDeletingBook] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);

  const handleDirtyChange = useCallback((value: boolean) => {
    dirtyRef.current = value;
    setDirty(value);
  }, []);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.id === selectedId) ?? null,
    [entries, selectedId],
  );

  const filteredEntries = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (!query) return entries;
    return entries.filter((entry) => {
      if (entry.name.toLowerCase().includes(query)) return true;
      if (entry.content.toLowerCase().includes(query)) return true;
      return (entry.keys ?? []).some((key) =>
        key.toLowerCase().includes(query),
      );
    });
  }, [entries, filter]);

  function confirmDiscard(): boolean {
    if (!dirtyRef.current) return true;
    const confirmed = window.confirm(
      "当前条目有未保存的修改，继续操作会丢失这些修改。确定继续吗？",
    );
    if (confirmed) {
      dirtyRef.current = false;
      setDirty(false);
    }
    return confirmed;
  }

  function selectEntry(id: string) {
    if (id === selectedId) return;
    if (!confirmDiscard()) return;
    setSelectedId(id);
  }

  async function createEntry() {
    if (creating) return;
    if (!confirmDiscard()) return;

    setCreating(true);
    try {
      const result = await apiFetch<{ entry: WorldbookEntryDTO }>(
        `/api/worldbooks/${book.id}/entries`,
        {
          method: "POST",
          body: JSON.stringify({
            name: `新条目 ${entries.length + 1}`,
            keys: [],
            content: "",
          }),
        },
      );
      setEntries((previous) => [...previous, result.entry]);
      setSelectedId(result.entry.id);
      setFilter("");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "创建条目失败，请稍后再试",
      );
    } finally {
      setCreating(false);
    }
  }

  function handleSaved(updated: WorldbookEntryDTO) {
    setEntries((previous) =>
      previous.map((entry) => (entry.id === updated.id ? updated : entry)),
    );
    router.refresh();
  }

  function handleDeleted(entryId: string) {
    const next = entries.filter((entry) => entry.id !== entryId);
    setEntries(next);
    setSelectedId(next[0]?.id ?? null);
    dirtyRef.current = false;
    setDirty(false);
    router.refresh();
  }

  async function deleteBook() {
    if (deletingBook) return;
    setDeletingBook(true);
    try {
      await apiFetch(`/api/worldbooks/${book.id}`, { method: "DELETE" });
      toast.success("世界书已从书架移除");
      router.push("/worldbooks");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "删除失败",
      );
      setDeletingBook(false);
    }
  }

  return (
    <div className="min-h-dvh">
      <div className="sticky top-16 z-20 border-b border-border/60 bg-background/80 backdrop-blur-xl lg:top-0">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6 lg:px-10">
          <Button variant="ghost" size="icon" asChild className="rounded-xl">
            <Link
              href="/worldbooks"
              aria-label="返回世界书列表"
              onClick={(event) => {
                if (!confirmDiscard()) event.preventDefault();
              }}
            >
              <ArrowLeft />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.26em] text-muted-foreground uppercase">
              Worldbook
            </p>
            <h1 className="truncate font-display text-lg font-medium">
              {book.name}
            </h1>
          </div>
          <span className="hidden text-[11px] text-muted-foreground sm:block">
            {entries.length} 个条目
          </span>
          <Button variant="outline" size="sm" asChild className="rounded-xl">
            <a
              href={`/api/worldbooks/${book.id}/export`}
              download
              aria-label="导出世界书"
            >
              <Download data-icon="inline-start" />
              <span className="hidden sm:inline">导出</span>
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSettingsOpen(true)}
            className="rounded-xl"
          >
            <Settings2 data-icon="inline-start" />
            设置
          </Button>
          <Button
            onClick={() => void createEntry()}
            disabled={creating}
            className="rounded-xl"
          >
            {creating ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Plus data-icon="inline-start" />
            )}
            新建条目
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div className="grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="lg:sticky lg:top-24">
            <div className="rounded-2xl border border-border/60 bg-card/30 p-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="筛选条目…"
                    className="h-8 rounded-lg bg-background/50 pr-2 pl-8 text-xs"
                  />
                </div>
                <Button
                  size="icon-sm"
                  onClick={() => void createEntry()}
                  disabled={creating}
                  aria-label="新建条目"
                >
                  <Plus />
                </Button>
              </div>

              <div className="mt-2 max-h-[45dvh] space-y-0.5 overflow-y-auto pr-0.5 lg:max-h-[calc(100dvh-19rem)]">
                {filteredEntries.length === 0 ? (
                  <p className="px-2 py-6 text-center text-[11px] text-muted-foreground">
                    {entries.length === 0
                      ? "还没有条目，点击上方 + 新建。"
                      : "没有匹配的条目。"}
                  </p>
                ) : (
                  filteredEntries.map((entry) => {
                    const active = entry.id === selectedId;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        onClick={() => selectEntry(entry.id)}
                        className={cn(
                          "flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left transition-colors",
                          active
                            ? "bg-primary/10 text-foreground"
                            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                        )}
                      >
                        <span
                          className={cn(
                            "mt-1.5 size-1.5 shrink-0 rounded-full",
                            entry.enabled
                              ? "bg-teal"
                              : "bg-muted-foreground/30",
                          )}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-medium">
                            {entry.name}
                          </span>
                          <span className="mt-0.5 block truncate text-[10px] opacity-80">
                            {entry.constant
                              ? "常驻注入"
                              : entry.keys?.length
                                ? entry.keys.slice(0, 3).join("、")
                                : "无关键词"}
                          </span>
                        </span>
                        {entry.probability < 100 && (
                          <span className="mt-0.5 text-[9px] opacity-70">
                            {entry.probability}%
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-2 border-t border-border/50 pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start rounded-lg text-[11px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 data-icon="inline-start" />
                      删除世界书
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>把世界书从书架移除？</AlertDialogTitle>
                      <AlertDialogDescription>
                        「{book.name}」及其 {entries.length} 个条目会被移除。
                        已经引用它的对话模板需要重新选择世界书。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>再想想</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => void deleteBook()}
                        disabled={deletingBook}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deletingBook ? "删除中…" : "确认删除"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            <div className="mt-3 hidden rounded-2xl border border-border/50 bg-card/20 p-3 text-[10px] leading-relaxed text-muted-foreground lg:block">
              提示：条目只有在关键词出现时才会注入。需要始终生效的设定，请开启「常驻注入」。
            </div>
          </aside>

          <section>
            {selectedEntry ? (
              <WorldbookEntryEditor
                key={selectedEntry.id}
                worldbookId={book.id}
                entry={selectedEntry}
                onSaved={handleSaved}
                onDeleted={handleDeleted}
                onDirtyChange={handleDirtyChange}
              />
            ) : (
              <EmptyState
                icon={BookOpen}
                title="选择或新建一个条目"
                description="世界书由一条条设定组成。写下地点、人物、规则或秘密，让它们在关键词出现时悄悄进入对话。"
                className="min-h-[28rem]"
                action={
                  <Button
                    onClick={() => void createEntry()}
                    disabled={creating}
                    className="rounded-xl"
                  >
                    <Plus data-icon="inline-start" />
                    新建第一个条目
                  </Button>
                }
              />
            )}
          </section>
        </div>
      </div>

      <WorldbookSettingsDialog
        book={book}
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSaved={(updated) =>
          setBook((previous) => ({
            ...previous,
            ...updated,
            entryCount: previous.entryCount,
          }))
        }
      />

      <span className="sr-only" aria-live="polite">
        {dirty ? "当前条目有未保存的修改" : "所有修改已保存"}
      </span>
    </div>
  );
}
