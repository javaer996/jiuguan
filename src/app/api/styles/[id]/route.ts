import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { chatStyles } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { sanitizeCustomCss } from "@/lib/css/sanitize";
import { toChatStyleDTO } from "@/lib/content/serializers";
import { chatStyleInputSchema } from "@/lib/validation/content";

type RouteParams = { params: Promise<{ id: string }> };

async function findOwned(id: string, userId: string) {
  const [row] = await getDb()
    .select()
    .from(chatStyles)
    .where(
      and(
        eq(chatStyles.id, id),
        eq(chatStyles.userId, userId),
        isNull(chatStyles.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ApiError(404, "STYLE_NOT_FOUND", "对话样式不存在或无权访问");
  }
  return row;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const row = await findOwned(id, context.user.id);
    return jsonOk({ style: toChatStyleDTO(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    await findOwned(id, context.user.id);

    const input = await readJson(request, chatStyleInputSchema);

    let customCss: string | null = null;
    if (input.customCss?.trim()) {
      try {
        customCss = sanitizeCustomCss(input.customCss);
      } catch (error) {
        throw new ApiError(
          400,
          "INVALID_CSS",
          error instanceof Error ? error.message : "自定义 CSS 不合法",
        );
      }
    }

    await getDb()
      .update(chatStyles)
      .set({
        name: input.name,
        description: input.description ?? null,
        builtInKey: input.builtInKey ?? null,
        config: input.config ?? null,
        customCss,
      })
      .where(
        and(eq(chatStyles.id, id), eq(chatStyles.userId, context.user.id)),
      );

    const row = await findOwned(id, context.user.id);
    return jsonOk({ style: toChatStyleDTO(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    await findOwned(id, context.user.id);

    await getDb()
      .update(chatStyles)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(chatStyles.id, id), eq(chatStyles.userId, context.user.id)),
      );

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
