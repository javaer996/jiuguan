"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiClientError, apiFetch } from "@/lib/client/api";

export function InviteCreateDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState("1");
  const [maxUses, setMaxUses] = useState("1");
  const [expiresAt, setExpiresAt] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    const countValue = Number(count);
    const maxUsesValue = Number(maxUses);
    if (!Number.isInteger(countValue) || countValue < 1 || countValue > 20) {
      toast.error("生成数量需在 1-20 之间");
      return;
    }
    if (!Number.isInteger(maxUsesValue) || maxUsesValue < 1) {
      toast.error("可用次数至少为 1");
      return;
    }

    setBusy(true);
    try {
      await apiFetch("/api/admin/invites", {
        method: "POST",
        body: JSON.stringify({
          count: countValue,
          maxUses: maxUsesValue,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
          note: note.trim() || undefined,
        }),
      });
      toast.success(`已生成 ${countValue} 个邀请码`);
      setOpen(false);
      setCount("1");
      setMaxUses("1");
      setExpiresAt("");
      setNote("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "生成失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-glow">
          <Plus data-icon="inline-start" />
          生成邀请码
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>生成邀请码</DialogTitle>
          <DialogDescription>
            邀请码只在创建时显示一次完整内容，请及时复制并妥善保管。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="invite-count">生成数量</Label>
              <Input
                id="invite-count"
                type="number"
                min={1}
                max={20}
                value={count}
                onChange={(event) => setCount(event.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-max-uses">每个可用次数</Label>
              <Input
                id="invite-max-uses"
                type="number"
                min={1}
                max={10000}
                value={maxUses}
                onChange={(event) => setMaxUses(event.target.value)}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-expires">过期时间（可选）</Label>
            <Input
              id="invite-expires"
              type="datetime-local"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-note">备注（可选）</Label>
            <Input
              id="invite-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="例如：给老朋友的入场券"
              maxLength={255}
              className="rounded-xl"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="rounded-xl"
          >
            取消
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy}
            className="rounded-xl"
          >
            {busy && <Loader2 data-icon="inline-start" className="animate-spin" />}
            生成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
