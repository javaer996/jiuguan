import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { chatSessions, chatTemplates, themes } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { toThemeDTO } from "@/lib/content/serializers";
import { sanitizeCustomCss } from "@/lib/css/sanitize";
import {
  sanitizeThemeBackgroundUrl,
  sanitizeThemeTokens,
  ThemeTokenError,
} from "@/lib/theme/tokens";
import { themeInputSchema } from "@/lib/validation/content";

type RouteParams = { params: Promise<{ id: string }> };

async function findOwned(id: string, userId: string) {
  const [row] = await getDb()
    .select()
    .from(themes)
    .where(
      and(eq(themes.id, id), eq(themes.userId, userId), isNull(themes.deletedAt)),
    )
    .limit(1);

  if (!row) {
    throw new ApiError(404, "THEME_NOT_FOUND", "主题不存在或无权访问");
  }
  return row;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const row = await findOwned(id, context.user.id);
    return jsonOk({ theme: toThemeDTO(row) });
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
    const input = await readJson(request, themeInputSchema.partial());

    let tokens: Record<string, string> | null | undefined;
    if (input.tokens !== undefined) {
      try {
        const sanitized = sanitizeThemeTokens(input.tokens);
        tokens = Object.keys(sanitized).length > 0 ? sanitized : null;
      } catch (error) {
        throw new ApiError(
          400,
          "INVALID_THEME_TOKENS",
          error instanceof ThemeTokenError ? error.message : "主题变量不合法",
        );
      }
    }

    let customCss: string | null | undefined;
    if (input.customCss !== undefined) {
      if (!input.customCss?.trim()) {
        customCss = null;
      } else {
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
    }

    let backgroundUrl: string | null | undefined;
    if (input.backgroundUrl !== undefined) {
      try {
        backgroundUrl = sanitizeThemeBackgroundUrl(input.backgroundUrl);
      } catch (error) {
        throw new ApiError(
          400,
          "INVALID_THEME_BACKGROUND",
          error instanceof ThemeTokenError ? error.message : "背景图地址不合法",
        );
      }
    }

    const db = getDb();
    await db.transaction(async (tx) => {
      if (input.isDefault === true) {
        await tx
          .update(themes)
          .set({ isDefault: false })
          .where(
            and(
              eq(themes.userId, context.user.id),
              isNull(themes.deletedAt),
            ),
          );
      }

      await tx
        .update(themes)
        .set({
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.description !== undefined
            ? { description: input.description ?? null }
            : {}),
          ...(tokens !== undefined ? { tokens } : {}),
          ...(customCss !== undefined ? { customCss } : {}),
          ...(backgroundUrl !== undefined ? { backgroundUrl } : {}),
          ...(input.mode !== undefined ? { mode: input.mode } : {}),
          ...(input.isDefault !== undefined
            ? { isDefault: input.isDefault }
            : {}),
        })
        .where(
          and(
            eq(themes.id, id),
            eq(themes.userId, context.user.id),
            isNull(themes.deletedAt),
          ),
        );
    });

    const row = await findOwned(id, context.user.id);
    return jsonOk({ theme: toThemeDTO(row) });
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

    await getDb().transaction(async (tx) => {
      // 软删除后清空引用，避免模板或旧对话继续指向不存在的主题。
      await tx
        .update(chatTemplates)
        .set({ themeId: null })
        .where(
          and(
            eq(chatTemplates.userId, context.user.id),
            eq(chatTemplates.themeId, id),
          ),
        );
      await tx
        .update(chatSessions)
        .set({ themeId: null })
        .where(
          and(
            eq(chatSessions.userId, context.user.id),
            eq(chatSessions.themeId, id),
          ),
        );
      await tx
        .update(themes)
        .set({ deletedAt: new Date(), isDefault: false })
        .where(
          and(
            eq(themes.id, id),
            eq(themes.userId, context.user.id),
            isNull(themes.deletedAt),
          ),
        );
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
