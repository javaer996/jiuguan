import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { messages } from "@/db/schema";
import { ApiError, handleApiError, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import {
  branchUpTo,
  findOwnedSession,
  loadChatContext,
} from "@/lib/chat/context";
import { createAssistantStream } from "@/lib/chat/generate";
import { regenerateSchema } from "@/lib/validation/chat";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    const session = await findOwnedSession(id, context.user.id);
    const input = await readJson(request, regenerateSchema);
    const chatContext = await loadChatContext(session);

    let target = null;

    if (input.messageId) {
      target =
        chatContext.allMessages.find(
          (message) =>
            message.id === input.messageId && message.role === "assistant",
        ) ?? null;
    } else {
      target =
        [...chatContext.branch]
          .reverse()
          .find((message) => message.role === "assistant") ?? null;
    }

    if (!target) {
      throw new ApiError(400, "NOTHING_TO_REGENERATE", "没有可以重新生成的回复");
    }

    const parentId = target.parentId;
    const assistantId = uuidv7();

    await getDb().insert(messages).values({
      id: assistantId,
      sessionId: session.id,
      parentId,
      role: "assistant",
      content: "",
      status: "streaming",
      metadata: {
        regeneratedFrom: target.id,
      },
    });

    return createAssistantStream({
      context: {
        ...chatContext,
        branch: branchUpTo(chatContext.allMessages, parentId),
      },
      assistantId,
      parentId,
      userName: context.user.displayName,
      requestSignal: request.signal,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
