import { and, desc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { sessionMemories } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import {
  findOwnedSession,
  loadChatContext,
} from "@/lib/chat/context";
import {
  toCompressionDTO,
  toMemoryDTO,
} from "@/lib/chat/memory";
import { memoryCreateSchema } from "@/lib/validation/chat";

type RouteParams = { params: Promise<{ id: string }> };

const MAX_MEMORIES = 100;

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const session = await findOwnedSession(id, context.user.id);

    const [rows, chatContext] = await Promise.all([
      getDb()
        .select()
        .from(sessionMemories)
        .where(
          and(
            eq(sessionMemories.sessionId, session.id),
            eq(sessionMemories.userId, context.user.id),
          ),
        )
        .orderBy(
          desc(sessionMemories.importance),
          desc(sessionMemories.updatedAt),
        )
        .limit(MAX_MEMORIES),
      loadChatContext(session),
    ]);

    return jsonOk({
      memories: rows.map(toMemoryDTO),
      compression: chatContext.compression
        ? toCompressionDTO(chatContext.compression)
        : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    const session = await findOwnedSession(id, context.user.id);
    const input = await readJson(request, memoryCreateSchema);

    const existing = await getDb()
      .select({ id: sessionMemories.id })
      .from(sessionMemories)
      .where(eq(sessionMemories.sessionId, session.id))
      .limit(MAX_MEMORIES + 1);

    if (existing.length >= MAX_MEMORIES) {
      throw new ApiError(
        400,
        "TOO_MANY_MEMORIES",
        `每个会话最多保存 ${MAX_MEMORIES} 条记忆`,
      );
    }

    const memoryId = uuidv7();
    await getDb().insert(sessionMemories).values({
      id: memoryId,
      sessionId: session.id,
      userId: context.user.id,
      kind: input.kind ?? "note",
      title: input.title ?? null,
      content: input.content,
      importance: input.importance ?? 1,
      enabled: input.enabled ?? true,
    });

    const [row] = await getDb()
      .select()
      .from(sessionMemories)
      .where(eq(sessionMemories.id, memoryId))
      .limit(1);

    if (!row) throw new Error("记忆创建失败");

    return jsonOk({ memory: toMemoryDTO(row) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
