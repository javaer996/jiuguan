"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlazaCategoryForm } from "@/components/admin/plaza-category-form";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type { AdminPlazaCategoryDTO } from "@/lib/types/plaza";

export function PlazaCategoryActions({
  category,
}: {
  category: AdminPlazaCategoryDTO;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    try {
      const result = await apiFetch<{ affectedTemplates: number }>(
        `/api/admin/plaza/categories/${category.id}`,
        { method: "DELETE" },
      );
      toast.success(
        result.affectedTemplates > 0
          ? `已删除「${category.name}」，${result.affectedTemplates} 套投稿变为未分类`
          : `已删除「${category.name}」`,
      );
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
            aria-label={`管理分类 ${category.name}`}
            disabled={busy}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onSelect={() => setEditOpen(true)}>
            <Pencil />
            编辑
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(event) => {
              event.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <Trash2 />
            删除
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>编辑分类</DialogTitle>
            <DialogDescription>
              修改后会立即同步到广场筛选条与投稿表单。
            </DialogDescription>
          </DialogHeader>
          <PlazaCategoryForm
            category={category}
            onDone={() => setEditOpen(false)}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除分类「{category.name}」？</AlertDialogTitle>
            <AlertDialogDescription>
              {category.totalTemplateCount > 0
                ? `该分类下的 ${category.totalTemplateCount} 套投稿会变成「未分类」，内容不会丢失，之后可以再给它们指定新分类。`
                : "该分类下还没有投稿，可以放心删除。"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>再想想</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={busy}
            >
              {busy && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
