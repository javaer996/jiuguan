import { and, eq, inArray, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import {
  apiProviders,
  characters,
  chatStyles,
  outputSchemas,
  personas,
  promptPresets,
  themes,
  worldbooks,
} from "@/db/schema";
import { ApiError } from "@/lib/api";

export type TemplateRefs = {
  characterId?: string | null;
  worldbookIds?: string[] | null;
  promptPresetId?: string | null;
  chatStyleId?: string | null;
  themeId?: string | null;
  outputSchemaId?: string | null;
  personaId?: string | null;
  providerId?: string | null;
};

async function assertOwned(
  table:
    | typeof characters
    | typeof promptPresets
    | typeof chatStyles
    | typeof themes
    | typeof outputSchemas
    | typeof personas
    | typeof apiProviders,
  id: string,
  userId: string,
  label: string,
) {
  const [row] = await getDb()
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.userId, userId), isNull(table.deletedAt)))
    .limit(1);

  if (!row) {
    throw new ApiError(400, "INVALID_TEMPLATE_REF", `引用的${label}不存在或无权访问`);
  }
}

/** 校验对话模板引用的资源都属于当前用户，避免跨用户引用。 */
export async function assertTemplateRefs(userId: string, refs: TemplateRefs) {
  const jobs: Promise<void>[] = [];

  if (refs.characterId) {
    jobs.push(assertOwned(characters, refs.characterId, userId, "角色"));
  }
  if (refs.promptPresetId) {
    jobs.push(assertOwned(promptPresets, refs.promptPresetId, userId, "提示词预设"));
  }
  if (refs.chatStyleId) {
    jobs.push(assertOwned(chatStyles, refs.chatStyleId, userId, "对话样式"));
  }
  if (refs.themeId) {
    jobs.push(assertOwned(themes, refs.themeId, userId, "主题"));
  }
  if (refs.outputSchemaId) {
    jobs.push(assertOwned(outputSchemas, refs.outputSchemaId, userId, "输出格式"));
  }
  if (refs.personaId) {
    jobs.push(assertOwned(personas, refs.personaId, userId, "身份"));
  }
  if (refs.providerId) {
    jobs.push(assertOwned(apiProviders, refs.providerId, userId, "API 供应商"));
  }
  if (refs.worldbookIds?.length) {
    const ids = [...new Set(refs.worldbookIds)];
    const rows = await getDb()
      .select({ id: worldbooks.id })
      .from(worldbooks)
      .where(
        and(
          inArray(worldbooks.id, ids),
          eq(worldbooks.userId, userId),
          isNull(worldbooks.deletedAt),
        ),
      );
    if (rows.length !== ids.length) {
      throw new ApiError(400, "INVALID_TEMPLATE_REF", "引用的世界书不存在或无权访问");
    }
  }

  await Promise.all(jobs);
}
