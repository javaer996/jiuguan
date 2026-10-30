import { eq, sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { chatSessions, messages } from "@/db/schema";
import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import {
  findOwnedSession,
  loadChatContext,
} from "@/lib/chat/context";
import { createAssistantStream } from "@/lib/chat/generate";
import { messageSendSchema } from "@/lib/validation/chat";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    const session = await findOwnedSession(id, context.user.id);
    const input = await readJson(request, messageSendSchema);

    const db = getDb();
    const userId = uuidv7();
    const assistantId = uuidv7();

    await db.transaction(async (tx) => {
      await tx.insert(messages).values({
        id: userId,
        sessionId: session.id,
        parentId: session.activeLeafId,
        role: "user",
        content: input.content,
        status: "complete",
      });

      await tx
        .update(chatSessions)
        .set({
          activeLeafId: userId,
          messageCount: sql`${chatSessions.messageCount} + 1`,
          lastMessageAt: new Date(),
        })
        .where(eq(chatSessions.id, session.id));
    });

    await db.insert(messages).values({
      id: assistantId,
      sessionId: session.id,
      parentId: userId,
      role: "assistant",
      content: "",
      status: "streaming",
    });

    const freshSession = await findOwnedSession(session.id, context.user.id);
    const chatContext = await loadChatContext(freshSession);

    return createAssistantStream({
      context: chatContext,
      assistantId,
      parentId: userId,
      userName: context.user.displayName,
      requestSignal: request.signal,
      debug:
        context.user.role === "admin" &&
        freshSession.settings?.debugMode === true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const session = await findOwnedSession(id, context.user.id);
    const chatContext = await loadChatContext(session);
    return jsonOk({
      messages: chatContext.branch.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        status: message.status,
        createdAt: message.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
