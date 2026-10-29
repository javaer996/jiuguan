import { and, desc, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { chatStyles } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { STYLE_PRESETS } from "@/lib/content/defaults";
import { sanitizeCustomCss } from "@/lib/css/sanitize";
import { parseLimit } from "@/lib/content/query";
import { toChatStyleDTO } from "@/lib/content/serializers";
import { chatStyleInputSchema } from "@/lib/validation/content";

export async function GET(request: Request) {
  try {
    const context = await requireUser();
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"), 100, 200);

    const rows = await getDb()
      .select()
      .from(chatStyles)
      .where(
        and(
          eq(chatStyles.userId, context.user.id),
          isNull(chatStyles.deletedAt),
        ),
      )
      .orderBy(desc(chatStyles.updatedAt))
      .limit(limit);

    return jsonOk({ styles: rows.map(toChatStyleDTO) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
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

    const id = uuidv7();
    await getDb()
      .insert(chatStyles)
      .values({
        id,
        userId: context.user.id,
        name: input.name,
        description: input.description ?? null,
        builtInKey: input.builtInKey ?? null,
        config: input.config ?? STYLE_PRESETS[0]!.config,
        customCss,
      });

    const [row] = await getDb()
      .select()
      .from(chatStyles)
      .where(eq(chatStyles.id, id))
      .limit(1);

    if (!row) throw new Error("样式创建失败");

    return jsonOk({ style: toChatStyleDTO(row) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
