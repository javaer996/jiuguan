"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/utils";

export function PlazaReviewForm({
  templateId,
  initialRating,
  initialContent,
}: {
  templateId: string;
  initialRating?: number | null;
  initialContent?: string | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initialRating ?? 0);
  const [content, setContent] = useState(initialContent ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (submitting) return;
    if (rating < 1) {
      toast.error("先点亮一颗星吧");
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(`/api/plaza/templates/${templateId}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          content: content.trim() || undefined,
        }),
      });
      toast.success(initialRating ? "评价已更新" : "谢谢你的评价");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "提交失败");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/35 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">
          {initialRating ? "修改你的评价" : "留下你的评价"}
        </p>
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              aria-label={`${value} 星`}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "size-4",
                  value <= rating
                    ? "fill-primary text-primary"
                    : "text-muted-foreground/40",
                )}
              />
            </button>
          ))}
        </div>
      </div>
      <Textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="这段情景哪里打动了你？（可选）"
        className="mt-3 min-h-20 resize-none bg-background/50 text-sm"
        maxLength={2000}
      />
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          onClick={() => void submit()}
          disabled={submitting}
          className="rounded-lg"
        >
          {submitting && (
            <Loader2 data-icon="inline-start" className="animate-spin" />
          )}
          发布评价
        </Button>
      </div>
    </div>
  );
}
