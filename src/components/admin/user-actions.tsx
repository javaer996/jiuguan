"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CircleCheck,
  MoreHorizontal,
  ShieldCheck,
  ShieldOff,
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

export function UserActions({
  userId,
  username,
  role,
  status,
  isSelf,
}: {
  userId: string;
  username: string;
  role: "user" | "admin";
  status: "active" | "suspended" | "deleted";
  isSelf: boolean;
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>, message: string) {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/users/${userId}`, {
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
      await apiFetch(`/api/admin/users/${userId}`, { method: "DELETE" });
      toast.success("用户已删除");
      setConfirmOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "删除失败");
    } finally {
      setBusy(false);
    }
  }

  if (isSelf) {
    return (
      <span className="text-[11px] text-muted-foreground">当前账号</span>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground"
            aria-label={`管理用户 ${username}`}
            disabled={busy}
          >
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem
            onSelect={() =>
              void patch(
                { role: role === "admin" ? "user" : "admin" },
                role === "admin" ? "已取消管理员" : "已设为管理员",
              )
            }
          >
            {role === "admin" ? <ShieldOff /> : <ShieldCheck />}
            {role === "admin" ? "取消管理员" : "设为管理员"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() =>
              void patch(
                { status: status === "active" ? "suspended" : "active" },
                status === "active" ? "已停用账号" : "已恢复账号",
              )
            }
          >
            {status === "active" ? <Ban /> : <CircleCheck />}
            {status === "active" ? "停用账号" : "恢复账号"}
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
            删除用户
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除用户 @{username}？</AlertDialogTitle>
            <AlertDialogDescription>
              账号会被软删除并立即退出所有设备。其角色、会话与广场投稿会保留，但不再出现在用户列表中。
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
