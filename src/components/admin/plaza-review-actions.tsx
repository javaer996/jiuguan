"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Check,
  Loader2,
  Sparkles,
  SparklesIcon,
  X,
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type { PlazaStatus } from "@/lib/types/plaza";

type Action = "approve" | "reject" | "archive" | "feature" | "unfeature";

export function PlazaReviewActions({
  templateId,
  title,
  featured,
  published,
  status,
}: {
  templateId: string;
  title: string;
  featured: boolean;
  published: boolean;
  status: PlazaStatus;
}) {
  const canApprove =
    status === "pending" || status === "rejected" || status === "archived";
  const canReject = status === "pending";
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  async function run(action: Action, extra?: { reason?: string }) {
    if (busy) return;
    setBusy(action);
    try {
      await apiFetch(`/api/admin/plaza/templates/${templateId}/review`, {
        method: "POST",
        body: JSON.stringify({ action, ...extra }),
      });
      const messages: Record<Action, string> = {
        approve: "已通过并发布",
        reject: "已退回投稿",
        archive: "已下架",
        feature: "已设为推荐",
        unfeature: "已取消推荐",
      };
      toast.success(messages[action]);
      setRejectOpen(false);
      setReason("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "操作失败");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {canApprove && (
          <Button
            size="sm"
            onClick={() => void run("approve")}
            disabled={busy !== null}
            className="rounded-lg"
          >
            {busy === "approve" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Check data-icon="inline-start" />
            )}
            通过
          </Button>
        )}
        {canReject && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setRejectOpen(true)}
            disabled={busy !== null}
            className="rounded-lg"
          >
            {busy === "reject" ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <X data-icon="inline-start" />
            )}
            退回
          </Button>
        )}
        {published && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void run(featured ? "unfeature" : "feature")}
            disabled={busy !== null}
            className="rounded-lg"
          >
            {featured ? (
              <SparklesIcon data-icon="inline-start" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            {featured ? "取消推荐" : "设为推荐"}
          </Button>
        )}
        {published && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void run("archive")}
            disabled={busy !== null}
            className="rounded-lg text-muted-foreground"
          >
            <Archive data-icon="inline-start" />
            下架
          </Button>
        )}
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>退回「{title}」</DialogTitle>
            <DialogDescription>
              请写下审核意见，作者修改后可以重新提交。
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="例如：简介与内容不符，请补充世界书说明。"
            maxLength={500}
            className="min-h-24 resize-none"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              className="rounded-lg"
            >
              取消
            </Button>
            <Button
              onClick={() => {
                if (!reason.trim()) {
                  toast.error("请填写退回原因");
                  return;
                }
                void run("reject", { reason: reason.trim() });
              }}
              disabled={busy !== null}
              className="rounded-lg"
            >
              {busy === "reject" && (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              )}
              确认退回
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
