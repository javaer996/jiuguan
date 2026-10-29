"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  BookmarkCheck,
  Heart,
  Loader2,
  Play,
  CopyPlus,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import { cn } from "@/lib/utils";

type PlazaActionsProps = {
  templateId: string;
  published: boolean;
  liked: boolean;
  likeCount: number;
  favorited: boolean;
};

export function PlazaActions({
  templateId,
  published,
  liked: initialLiked,
  likeCount: initialLikeCount,
  favorited: initialFavorited,
}: PlazaActionsProps) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [favorited, setFavorited] = useState(initialFavorited);
  const [liking, setLiking] = useState(false);
  const [favoriting, setFavoriting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [copying, setCopying] = useState(false);

  async function toggleLike() {
    if (liking) return;
    setLiking(true);
    try {
      const data = await apiFetch<{ liked: boolean; likeCount: number }>(
        `/api/plaza/templates/${templateId}/like`,
        { method: "POST" },
      );
      setLiked(data.liked);
      setLikeCount(data.likeCount);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "操作失败");
    } finally {
      setLiking(false);
    }
  }

  async function toggleFavorite() {
    if (favoriting) return;
    setFavoriting(true);
    try {
      const data = await apiFetch<{ favorited: boolean }>(
        `/api/plaza/templates/${templateId}/favorite`,
        { method: "POST" },
      );
      setFavorited(data.favorited);
      toast.success(data.favorited ? "已收藏" : "已取消收藏");
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "操作失败");
    } finally {
      setFavoriting(false);
    }
  }

  async function cloneTemplate() {
    const data = await apiFetch<{ chatTemplateId: string }>(
      `/api/plaza/templates/${templateId}/clone`,
      { method: "POST" },
    );
    return data.chatTemplateId;
  }

  async function startStory() {
    if (starting || !published) return;
    setStarting(true);
    try {
      const chatTemplateId = await cloneTemplate();
      const chat = await apiFetch<{ session: { id: string } }>("/api/chats", {
        method: "POST",
        body: JSON.stringify({ templateId: chatTemplateId }),
      });
      router.push(`/chats/${chat.session.id}`);
    } catch (error) {
      toast.error(
        error instanceof ApiClientError ? error.message : "开始故事失败",
      );
      setStarting(false);
    }
  }

  async function copyTemplate() {
    if (copying || !published) return;
    setCopying(true);
    try {
      const chatTemplateId = await cloneTemplate();
      toast.success("已复制到我的模板");
      router.push(`/templates/${chatTemplateId}`);
    } catch (error) {
      toast.error(error instanceof ApiClientError ? error.message : "复制失败");
      setCopying(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        onClick={() => void startStory()}
        disabled={!published || starting}
        className="rounded-xl shadow-glow"
      >
        {starting ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <Play data-icon="inline-start" />
        )}
        一键开始
      </Button>
      <Button
        variant="outline"
        onClick={() => void copyTemplate()}
        disabled={!published || copying}
        className="rounded-xl"
      >
        {copying ? (
          <Loader2 data-icon="inline-start" className="animate-spin" />
        ) : (
          <CopyPlus data-icon="inline-start" />
        )}
        复制到我的模板
      </Button>

      <Button
        variant="ghost"
        onClick={() => void toggleLike()}
        disabled={liking || !published}
        className={cn(
          "rounded-xl",
          liked ? "text-primary" : "text-muted-foreground",
        )}
      >
        <Heart
          data-icon="inline-start"
          className={liked ? "fill-current" : undefined}
        />
        {likeCount}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => void toggleFavorite()}
        disabled={favoriting || !published}
        aria-label={favorited ? "取消收藏" : "收藏"}
        className={cn(
          "rounded-xl",
          favorited ? "text-primary" : "text-muted-foreground",
        )}
      >
        {favorited ? <BookmarkCheck /> : <Bookmark />}
      </Button>

      {!published && (
        <span className="text-xs text-muted-foreground">
          审核通过后即可使用
        </span>
      )}
    </div>
  );
}
