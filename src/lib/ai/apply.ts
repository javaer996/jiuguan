import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import {
  characters,
  chatStyles,
  chatTemplates,
  personas,
  promptPresets,
  themes,
  worldbooks,
  worldbookEntries,
} from "@/db/schema";
import { ApiError } from "@/lib/api";
import {
  AI_KINDS,
  AI_KIND_LABELS,
  parseAiDraft,
  type AiDraft,
  type AiDraftByKind,
  type AiKind,
} from "@/lib/ai/drafts";
import { stripDebugMode } from "@/lib/chat/settings";
import { assertTemplateRefs } from "@/lib/content/refs";
import { sanitizeCustomCss } from "@/lib/css/sanitize";
import {
  sanitizeThemeBackgroundUrl,
  sanitizeThemeTokens,
} from "@/lib/theme/tokens";
import type { StudioSaveResult } from "@/lib/types/studio";

type Db = ReturnType<typeof getDb>;
type DbExecutor = Pick<Db, "insert">;

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
      `${AI_KIND_LABELS[kind]}生成内容不完整：${
        error instanceof Error ? error.message : "未知错误"
      }`,
    );
  }
}

export function hrefFor(kind: AiKind, id: string) {
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

/**
 * 在调用方的事务里保存一份 AI 草稿。
 * 不在这里开启嵌套事务，世界书的 book + entries 由同一个 tx 保证原子性。
 */
export async function saveAiDraft<K extends AiKind>(
  tx: DbExecutor,
  userId: string,
  kind: K,
  draft: unknown,
): Promise<{ kind: K; id: string; href: string }> {
  const id = uuidv7();

  switch (kind) {
    case "character": {
      const data = parseDraft("character", draft);
      await tx.insert(characters).values({
        id,
        userId,
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
      break;
    }
    case "worldbook": {
      const data = parseDraft("worldbook", draft);
      await tx.insert(worldbooks).values({
        id,
        userId,
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
          caseSensitive: entry.caseSensitive ?? null,
          matchWholeWords: entry.matchWholeWords ?? null,
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
      break;
    }
    case "prompt": {
      const data = parseDraft("prompt", draft);
      await tx.insert(promptPresets).values({
        id,
        userId,
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
      break;
    }
    case "style": {
      const data = parseDraft("style", draft);
      await tx.insert(chatStyles).values({
        id,
        userId,
        name: data.name,
        description: data.description ?? null,
        builtInKey: null,
        config: data.config ?? null,
        customCss: null,
      });
      break;
    }
    case "theme": {
      const data = parseDraft("theme", draft);
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
        throw new ApiError(
          400,
          "INVALID_THEME_TOKENS",
          "主题变量为空",
        );
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

      await tx.insert(themes).values({
        id,
        userId,
        name: data.name,
        description: data.description ?? null,
        tokens,
        customCss,
        backgroundUrl,
        mode: data.mode ?? "both",
        isDefault: false,
      });
      break;
    }
  }

  return { kind, id, href: hrefFor(kind, id) };
}

/**
 * 把创作工坊生成的一组草稿保存为资产，并创建一个引用它们的对话模板。
 * 资产 ID 在事务内预生成，模板直接引用新 ID，避免事务内查不到未提交行。
 */
export async function saveStudioBundle(input: {
  userId: string;
  templateName: string;
  templateDescription?: string | null;
  providerId?: string | null;
  personaId?: string | null;
  persona?: { name: string; description?: string | null } | null;
  drafts: Record<string, unknown>;
}): Promise<StudioSaveResult> {
  const kinds = AI_KINDS.filter((kind) => input.drafts[kind] !== undefined);
  if (kinds.length === 0) {
    throw new ApiError(400, "EMPTY_BUNDLE", "没有可保存的内容");
  }

  const parsed: Partial<Record<AiKind, AiDraft>> = {};
  for (const kind of kinds) {
    parsed[kind] = parseDraft(kind, input.drafts[kind]);
  }

  if (input.providerId || input.personaId) {
    await assertTemplateRefs(input.userId, {
      providerId: input.providerId,
      personaId: input.personaId,
    });
  }

  const result = await getDb().transaction(async (tx) => {
    const assets: StudioSaveResult["assets"] = {};
    for (const kind of kinds) {
      const asset = await saveAiDraft(tx, input.userId, kind, parsed[kind]!);
      assets[kind] = { id: asset.id, href: asset.href };
    }

    let personaId = input.personaId ?? null;
    let createdPersona: { id: string; name: string } | undefined;
    if (input.persona) {
      personaId = uuidv7();
      const description =
        input.persona.description
          ?.replace(/\{\{\s*user\s*\}\}/gi, input.persona.name)
          .trim() || null;
      await tx.insert(personas).values({
        id: personaId,
        userId: input.userId,
        name: input.persona.name,
        avatarUrl: null,
        description,
        isDefault: false,
      });
      createdPersona = { id: personaId, name: input.persona.name };
    }

    const templateId = uuidv7();
    await tx.insert(chatTemplates).values({
      id: templateId,
      userId: input.userId,
      name: input.templateName,
      description: input.templateDescription ?? null,
      coverUrl: null,
      characterId: assets.character?.id ?? null,
      worldbookIds: assets.worldbook ? [assets.worldbook.id] : null,
      promptPresetId: assets.prompt?.id ?? null,
      chatStyleId: assets.style?.id ?? null,
      themeId: assets.theme?.id ?? null,
      outputSchemaId: null,
      personaId,
      providerId: input.providerId ?? null,
      settings: stripDebugMode({
        temperature: 0.85,
        maxTokens: 2048,
        stream: true,
      }) as typeof chatTemplates.$inferInsert.settings,
      greetingIndex: 0,
    });

    return {
      template: { id: templateId, href: `/templates/${templateId}` },
      assets,
      persona: createdPersona,
    };
  });

  return {
    ...result,
    skipped: AI_KINDS.filter(
      (kind) =>
        input.drafts[kind] !== undefined && !result.assets[kind],
    ),
  };
}
