import { z } from "zod";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import {
  characters,
  chatStyles,
  promptPresets,
  themes,
  worldbooks,
  worldbookEntries,
} from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import {
  AI_KINDS,
  parseAiDraft,
  type AiDraftByKind,
  type AiKind,
} from "@/lib/ai/drafts";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { sanitizeCustomCss } from "@/lib/css/sanitize";
import {
  sanitizeThemeBackgroundUrl,
  sanitizeThemeTokens,
} from "@/lib/theme/tokens";

const applySchema = z.object({
  kind: z.enum(AI_KINDS),
  draft: z.unknown(),
});

function parseDraft<K extends AiKind>(
  kind: K,
  value: unknown,
): AiDraftByKind[K] {
  try {
    return parseAiDraft(kind, value);
  } catch (error) {
    throw new ApiError(
      400,
      "INVALID_DRAFT",
      error instanceof Error ? error.message : "生成内容不完整",
    );
  }
}

function hrefFor(kind: AiKind, id: string) {
  switch (kind) {
    case "character":
      return `/characters/${id}`;
    case "worldbook":
      return `/worldbooks/${id}`;
    case "prompt":
      return `/prompts/${id}`;
    case "style":
      return `/styles/${id}`;
    case "theme":
      return `/themes/${id}`;
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, applySchema);
    const db = getDb();
    let id: string;

    if (input.kind === "character") {
      const data = parseDraft("character", input.draft);
      id = uuidv7();
      await db.insert(characters).values({
        id,
        userId: context.user.id,
        name: data.name,
        avatarUrl: null,
        tagline: data.tagline ?? null,
        description: data.description ?? null,
        personality: data.personality ?? null,
        scenario: data.scenario ?? null,
        firstMessage: data.firstMessage ?? null,
        alternateGreetings: data.alternateGreetings ?? null,
        exampleDialogue: data.exampleDialogue ?? null,
        systemPrompt: data.systemPrompt ?? null,
        postHistoryInstructions: data.postHistoryInstructions ?? null,
        creatorNotes: data.creatorNotes ?? null,
        tags: data.tags ?? null,
        source: "ai",
      });
    } else if (input.kind === "worldbook") {
      const data = parseDraft("worldbook", input.draft);
      id = uuidv7();
      await db.transaction(async (tx) => {
        await tx.insert(worldbooks).values({
          id,
          userId: context.user.id,
          name: data.name,
          description: data.description ?? null,
          scanDepth: data.scanDepth ?? 4,
          tokenBudget: data.tokenBudget ?? 2048,
          recursive: data.recursive ?? false,
          maxRecursionDepth: data.maxRecursionDepth ?? 2,
          caseSensitive: data.caseSensitive ?? false,
          matchWholeWords: data.matchWholeWords ?? false,
        });

        await tx.insert(worldbookEntries).values(
          data.entries.map((entry) => ({
            id: uuidv7(),
            worldbookId: id,
            name: entry.name,
            keys: entry.keys ?? [],
            secondaryKeys: entry.secondaryKeys ?? null,
            content: entry.content,
            constant: entry.constant ?? false,
            selective: entry.selective ?? true,
            selectiveLogic: entry.selectiveLogic ?? "and_any",
            position: entry.position ?? "after_char",
            depth: entry.depth ?? 4,
            sortOrder: entry.sortOrder ?? 100,
            probability: entry.probability ?? 100,
            useProbability: entry.useProbability ?? true,
            enabled: entry.enabled ?? true,
            caseSensitive: entry.caseSensitive ?? false,
            matchWholeWords: entry.matchWholeWords ?? false,
            groupName: entry.groupName ?? null,
            groupWeight: entry.groupWeight ?? 100,
            excludeRecursion: entry.excludeRecursion ?? false,
            preventRecursion: entry.preventRecursion ?? false,
            delayUntilRecursion: entry.delayUntilRecursion ?? false,
            scanDepth: entry.scanDepth ?? null,
            tokenBudget: entry.tokenBudget ?? null,
            extensions: entry.extensions ?? null,
          })),
        );
      });
    } else if (input.kind === "prompt") {
      const data = parseDraft("prompt", input.draft);
      id = uuidv7();
      await db.insert(promptPresets).values({
        id,
        userId: context.user.id,
        name: data.name,
        description: data.description ?? null,
        systemPrompt: data.systemPrompt ?? null,
        postHistoryInstructions: data.postHistoryInstructions ?? null,
        blocks:
          data.blocks?.map((block, index) => ({
            ...block,
            id: `block-${index + 1}`,
          })) ?? null,
        variables: data.variables ?? null,
        isDefault: false,
      });
    } else if (input.kind === "style") {
      const data = parseDraft("style", input.draft);
      id = uuidv7();
      await db.insert(chatStyles).values({
        id,
        userId: context.user.id,
        name: data.name,
        description: data.description ?? null,
        builtInKey: null,
        config: data.config ?? null,
        customCss: null,
      });
    } else {
      const data = parseDraft("theme", input.draft);
      let tokens: Record<string, string>;
      try {
        tokens = sanitizeThemeTokens(data.tokens);
      } catch (error) {
        throw new ApiError(
          400,
          "INVALID_THEME_TOKENS",
          error instanceof Error ? error.message : "主题变量不合法",
        );
      }
      if (Object.keys(tokens).length === 0) {
        throw new ApiError(400, "INVALID_THEME_TOKENS", "主题变量为空");
      }

      let customCss: string | null = null;
      if (data.customCss?.trim()) {
        try {
          customCss = sanitizeCustomCss(data.customCss);
        } catch (error) {
          throw new ApiError(
            400,
            "INVALID_CSS",
            error instanceof Error ? error.message : "自定义 CSS 不合法",
          );
        }
      }

      let backgroundUrl: string | null = null;
      try {
        backgroundUrl = sanitizeThemeBackgroundUrl(data.backgroundUrl);
      } catch (error) {
        throw new ApiError(
          400,
          "INVALID_THEME_BACKGROUND",
          error instanceof Error ? error.message : "背景图地址不合法",
        );
      }

      id = uuidv7();
      await db.insert(themes).values({
        id,
        userId: context.user.id,
        name: data.name,
        description: data.description ?? null,
        tokens,
        customCss,
        backgroundUrl,
        mode: data.mode ?? "both",
        isDefault: false,
      });
    }

    return jsonOk(
      { id, href: hrefFor(input.kind, id), kind: input.kind },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
