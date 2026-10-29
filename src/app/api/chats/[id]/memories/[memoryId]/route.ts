import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessionMemories } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { findOwnedSession } from "@/lib/chat/context";
import { toMemoryDTO } from "@/lib/chat/memory";
import { memoryUpdateSchema } from "@/lib/validation/chat";

type RouteParams = {
  params: Promise<{ id: string; memoryId: string }>;
};

async function findOwnedMemory(
  sessionId: string,
  memoryId: string,
  userId: string,
) {
  const [row] = await getDb()
    .select()
    .from(sessionMemories)
    .where(
      and(
        eq(sessionMemories.id, memoryId),
        eq(sessionMemories.sessionId, sessionId),
        eq(sessionMemories.userId, userId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ApiError(404, "MEMORY_NOT_FOUND", "记忆不存在或无权访问");
  }
  return row;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id, memoryId } = await params;
    const session = await findOwnedSession(id, context.user.id);
    await findOwnedMemory(session.id, memoryId, context.user.id);
    const input = await readJson(request, memoryUpdateSchema);

    await getDb()
      .update(sessionMemories)
      .set({
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.title !== undefined
          ? { title: input.title ?? null }
          : {}),
        ...(input.content !== undefined ? { content: input.content } : {}),
        ...(input.importance !== undefined
          ? { importance: input.importance }
          : {}),
        ...(input.enabled !== undefined ? { enabled: input.enabled } : {}),
      })
      .where(
        and(
          eq(sessionMemories.id, memoryId),
          eq(sessionMemories.sessionId, session.id),
          eq(sessionMemories.userId, context.user.id),
        ),
      );

    const row = await findOwnedMemory(
      session.id,
      memoryId,
      context.user.id,
    );
    return jsonOk({ memory: toMemoryDTO(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id, memoryId } = await params;
    const session = await findOwnedSession(id, context.user.id);
    await findOwnedMemory(session.id, memoryId, context.user.id);

    await getDb()
      .delete(sessionMemories)
      .where(
        and(
          eq(sessionMemories.id, memoryId),
          eq(sessionMemories.sessionId, session.id),
          eq(sessionMemories.userId, context.user.id),
        ),
      );

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
