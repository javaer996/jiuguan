"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiClientError, apiFetch } from "@/lib/client/api";

export function SessionActions({
  sessionId,
  title,
  pinned,
  archived = false,
}: {
  sessionId: string;
  title: string;
  pinned: boolean;
  archived?: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/chats/${sessionId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      toast.success(message);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/chats/${sessionId}`, { method: "DELETE" });
      toast.success("对话已删除");
      setConfirmOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground"
            aria-label="对话操作"
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onSelect={() =>
              void patch({ pinned: !pinned }, pinned ? "已取消置顶" : "已置顶")
            }
          >
            {pinned ? <PinOff /> : <Pin />}
            {pinned ? "取消置顶" : "置顶"}
          </DropdownMenuItem>
          {archived ? (
            <DropdownMenuItem
              onSelect={() => void patch({ archived: false }, "已恢复")}
            >
              <ArchiveRestore />
              恢复
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onSelect={() => void patch({ archived: true }, "已归档")}
            >
              <Archive />
              归档
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(event) => {
              event.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Trash2 />
            删除对话
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除「{title}」？</AlertDialogTitle>
            <AlertDialogDescription>
              对话会从列表中移除，但消息仍保留在数据库中，暂不支持恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>再想想</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              disabled={busy}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
