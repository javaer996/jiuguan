"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ApiClientError, apiFetch } from "@/lib/client/api";
import type { ChatSessionDTO } from "@/lib/types/chat";

export function StartChatButton({
  characterId,
  templateId,
  children,
  variant = "default",
  className,
  size,
}: {
  characterId?: string;
  templateId?: string;
  children?: ReactNode;
  variant?: "default" | "outline" | "ghost" | "secondary";
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    if (loading) return;
    setLoading(true);
    try {
      const result = await apiFetch<{ session: ChatSessionDTO }>("/api/chats", {
        method: "POST",
        body: JSON.stringify({ characterId, templateId }),
      });
      router.push(`/chats/${result.session.id}`);
    } catch (error) {
      toast.error(
        error instanceof ApiClientError
          ? error.message
          : "暂时无法开始对话，请稍后再试",
      );
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={() => void handleStart()}
      disabled={loading}
    >
      {loading ? (
        <Loader2 data-icon="inline-start" className="animate-spin" />
      ) : (
        <MessageSquarePlus data-icon="inline-start" />
      )}
      {children ?? "开始对话"}
    </Button>
  );
}
