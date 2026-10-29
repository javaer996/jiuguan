"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type { AdminSharedProviderDTO, AdminUserDTO } from "@/lib/types/admin";

export function ProviderGrantsDialog({
  provider,
  users,
}: {
  provider: AdminSharedProviderDTO;
  users: AdminUserDTO[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const grantedIds = useMemo(
    () => new Set(provider.grants.map((grant) => grant.userId)),
    [provider.grants],
  );
  const candidates = users.filter(
    (user) => user.status === "active" && !grantedIds.has(user.id),
  );

  async function mutate(targetId: string, action: "grant" | "revoke") {
    if (busy) return;
    setBusy(targetId);
    try {
      await apiFetch(`/api/admin/providers/${provider.id}/grants`, {
        method: "POST",
        body: JSON.stringify({ userId: targetId, action }),
      });
      toast.success(action === "grant" ? "已授权" : "已撤销授权");
      if (action === "grant") setUserId("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "操作失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="rounded-lg">
          <Users data-icon="inline-start" />
          管理授权（{provider.grants.length}）
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>「{provider.name}」的授权用户</DialogTitle>
          <DialogDescription>
            被授权的用户可以在自己的设置中选择这个共享供应商，消耗的是供应商所有者的 API 额度。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <p className="text-xs font-medium">已授权</p>
            {provider.grants.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/60 px-3 py-4 text-center text-xs text-muted-foreground">
                还没有授权任何用户
              </p>
            ) : (
              <div className="space-y-1.5">
                {provider.grants.map((grant) => (
                  <div
                    key={grant.userId}
                    className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/30 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium">
                        {grant.displayName}
                      </p>
                      <p className="truncate text-[10px] text-muted-foreground">
                        @{grant.username}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void mutate(grant.userId, "revoke")}
                      disabled={busy === grant.userId}
                      className="size-7 rounded-lg text-muted-foreground hover:text-destructive"
                      aria-label={`撤销 ${grant.displayName} 的授权`}
                    >
                      {busy === grant.userId ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <X className="size-3.5" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium">新增授权</p>
            <div className="flex gap-2">
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="选择一位用户" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.length === 0 ? (
                    <SelectItem value="__none" disabled>
                      没有可授权的用户
                    </SelectItem>
                  ) : (
                    candidates.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.displayName} · @{user.username}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={() => userId && void mutate(userId, "grant")}
                disabled={!userId || busy !== null}
                className="shrink-0 rounded-xl"
              >
                {busy === userId ? (
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                ) : (
                  <UserPlus data-icon="inline-start" />
                )}
                授权
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-xl"
          >
            关闭
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
