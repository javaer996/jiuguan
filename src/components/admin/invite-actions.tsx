"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, Power, PowerOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiClientError, apiFetch } from "@/lib/client/api";

export function InviteActions({
  inviteId,
  code,
  disabled,
}: {
  inviteId: string;
  code: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success("邀请码已复制");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      await apiFetch(`/api/admin/invites/${inviteId}`, {
        method: "PATCH",
        body: JSON.stringify({ disabled: !disabled }),
      });
      toast.success(disabled ? "邀请码已启用" : "邀请码已停用");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void copy()}
        className="size-8 rounded-lg text-muted-foreground"
        aria-label="复制邀请码"
      >
        {copied ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => void toggle()}
        disabled={busy}
        className="size-8 rounded-lg text-muted-foreground"
        aria-label={disabled ? "启用邀请码" : "停用邀请码"}
      >
        {busy ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : disabled ? (
          <Power className="size-3.5" />
        ) : (
          <PowerOff className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
