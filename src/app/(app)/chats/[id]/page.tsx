import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChatView } from "@/components/chat/chat-view";
import { requireUserPage } from "@/lib/auth/page";
import {
  findOwnedSession,
  loadChatContext,
  toChatDetailDTO,
} from "@/lib/chat/context";
import type { ChatDetailDTO } from "@/lib/types/chat";

export const metadata: Metadata = {
  title: "对话",
};

export const dynamic = "force-dynamic";

export default async function ChatDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const context = await requireUserPage(`/chats/${id}`);

  let detail: ChatDetailDTO | null = null;
  try {
    const session = await findOwnedSession(id, context.user.id);
    const chatContext = await loadChatContext(session);
    detail = await toChatDetailDTO(chatContext);
  } catch {
    detail = null;
  }

  if (!detail) notFound();

  return (
    <ChatView initial={detail} isAdmin={context.user.role === "admin"} />
  );
}
