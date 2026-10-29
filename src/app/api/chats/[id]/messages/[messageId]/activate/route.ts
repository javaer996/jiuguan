import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { chatSessions, messages } from "@/db/schema";
import { ApiError, handleApiError, jsonOk } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import {
  findOwnedSession,
  loadChatContext,
  toChatDetailDTO,
} from "@/lib/chat/context";

type RouteParams = { params: Promise<{ id: string; messageId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id, messageId } = await params;
    const session = await findOwnedSession(id, context.user.id);
    const chatContext = await loadChatContext(session);
    const byId = new Map(
      chatContext.allMessages.map((message) => [message.id, message]),
    );
    const target = byId.get(messageId);

    if (!target) {
      throw new ApiError(404, "MESSAGE_NOT_FOUND", "消息不存在");
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      let node = target;
      while (node.parentId) {
        const parent = byId.get(node.parentId);
        if (!parent) break;
        await tx
          .update(messages)
          .set({ activeChildId: node.id })
          .where(eq(messages.id, parent.id));
        node = parent;
      }
    });

    let leaf = target;
    while (leaf.activeChildId) {
      const child = byId.get(leaf.activeChildId);
      if (!child) break;
      leaf = child;
    }

    await db
      .update(chatSessions)
      .set({ activeLeafId: leaf.id })
      .where(eq(chatSessions.id, session.id));

    const freshSession = await findOwnedSession(session.id, context.user.id);
    const freshContext = await loadChatContext(freshSession);

    return jsonOk(await toChatDetailDTO(freshContext));
  } catch (error) {
    return handleApiError(error);
  }
}
