import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { chatSessions, messages } from "@/db/schema";
import { ApiError, handleApiError, jsonOk } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { findOwnedSession, loadChatContext } from "@/lib/chat/context";

type RouteParams = { params: Promise<{ id: string; messageId: string }> };

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id, messageId } = await params;
    const session = await findOwnedSession(id, context.user.id);
    const chatContext = await loadChatContext(session);
    const target = chatContext.allMessages.find(
      (message) => message.id === messageId,
    );

    if (!target) {
      throw new ApiError(404, "MESSAGE_NOT_FOUND", "消息不存在");
    }

    const childrenByParent = new Map<string, string[]>();
    for (const message of chatContext.allMessages) {
      if (!message.parentId) continue;
      const list = childrenByParent.get(message.parentId);
      if (list) list.push(message.id);
      else childrenByParent.set(message.parentId, [message.id]);
    }

    const toDelete = new Set<string>([target.id]);
    const queue = [target.id];
    while (queue.length > 0) {
      const current = queue.pop()!;
      for (const childId of childrenByParent.get(current) ?? []) {
        if (!toDelete.has(childId)) {
          toDelete.add(childId);
          queue.push(childId);
        }
      }
    }

    const ids = [...toDelete];
    const db = getDb();

    await db.transaction(async (tx) => {
      await tx.delete(messages).where(inArray(messages.id, ids));

      if (target.parentId && toDelete.has(target.parentId) === false) {
        const [parent] = await tx
          .select({ activeChildId: messages.activeChildId })
          .from(messages)
          .where(eq(messages.id, target.parentId))
          .limit(1);

        if (parent?.activeChildId && toDelete.has(parent.activeChildId)) {
          await tx
            .update(messages)
            .set({ activeChildId: null })
            .where(eq(messages.id, target.parentId));
        }
      }

      await tx
        .update(chatSessions)
        .set({
          activeLeafId:
            session.activeLeafId && toDelete.has(session.activeLeafId)
              ? target.parentId
              : session.activeLeafId,
          messageCount: sql`GREATEST(${chatSessions.messageCount} - ${ids.length}, 0)`,
        })
        .where(
          and(
            eq(chatSessions.id, session.id),
            eq(chatSessions.userId, context.user.id),
          ),
        );
    });

    return jsonOk({ deleted: ids.length });
  } catch (error) {
    return handleApiError(error);
  }
}
