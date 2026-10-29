import { and, desc, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { themes } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { parseLimit } from "@/lib/content/query";
import { toThemeDTO } from "@/lib/content/serializers";
import { sanitizeCustomCss } from "@/lib/css/sanitize";
import {
  sanitizeThemeBackgroundUrl,
  sanitizeThemeTokens,
  ThemeTokenError,
} from "@/lib/theme/tokens";
import { themeInputSchema } from "@/lib/validation/content";

function sanitizeCss(value: string | null | undefined) {
  if (!value?.trim()) return null;
  try {
    return sanitizeCustomCss(value);
  } catch (error) {
    throw new ApiError(
      400,
      "INVALID_CSS",
      error instanceof Error ? error.message : "自定义 CSS 不合法",
    );
  }
}

function sanitizeTokens(value: Record<string, string> | null | undefined) {
  try {
    return sanitizeThemeTokens(value);
  } catch (error) {
    throw new ApiError(
      400,
      "INVALID_THEME_TOKENS",
      error instanceof ThemeTokenError ? error.message : "主题变量不合法",
    );
  }
}

function sanitizeBackground(value: string | null | undefined) {
  try {
    return sanitizeThemeBackgroundUrl(value);
  } catch (error) {
    throw new ApiError(
      400,
      "INVALID_THEME_BACKGROUND",
      error instanceof ThemeTokenError ? error.message : "背景图地址不合法",
    );
  }
}

export async function GET(request: Request) {
  try {
    const context = await requireUser();
    const url = new URL(request.url);
    const limit = parseLimit(url.searchParams.get("limit"), 100, 200);

    const rows = await getDb()
      .select()
      .from(themes)
      .where(and(eq(themes.userId, context.user.id), isNull(themes.deletedAt)))
      .orderBy(desc(themes.isDefault), desc(themes.updatedAt))
      .limit(limit);

    return jsonOk({ themes: rows.map(toThemeDTO) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, themeInputSchema);

    const tokens = sanitizeTokens(input.tokens);
    const customCss = sanitizeCss(input.customCss);
    const backgroundUrl = sanitizeBackground(input.backgroundUrl);
    const isDefault = input.isDefault === true;
    const id = uuidv7();
    const db = getDb();

    await db.transaction(async (tx) => {
      if (isDefault) {
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

      await tx.insert(themes).values({
        id,
        userId: context.user.id,
        name: input.name,
        description: input.description ?? null,
        tokens,
        customCss,
        backgroundUrl,
        mode: input.mode ?? "both",
        isDefault,
      });
    });

    const [row] = await db
      .select()
      .from(themes)
      .where(eq(themes.id, id))
      .limit(1);

    if (!row) throw new Error("主题创建失败");

    return jsonOk({ theme: toThemeDTO(row) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
