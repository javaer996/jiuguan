import { and, asc, eq, isNull } from "drizzle-orm";
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
import type { TemplateOptions } from "@/lib/types/content";

/** 读取模板编辑器可选的资源，全部限定在当前用户名下。 */
export async function loadTemplateOptions(
  userId: string,
): Promise<TemplateOptions> {
  const db = getDb();

  const [characterRows, worldbookRows, promptRows, styleRows, schemaRows, personaRows, themeRows, providerRows] =
    await Promise.all([
      db
        .select({
          id: characters.id,
          name: characters.name,
          avatarUrl: characters.avatarUrl,
        })
        .from(characters)
        .where(
          and(eq(characters.userId, userId), isNull(characters.deletedAt)),
        )
        .orderBy(asc(characters.name)),
      db
        .select({ id: worldbooks.id, name: worldbooks.name })
        .from(worldbooks)
        .where(
          and(eq(worldbooks.userId, userId), isNull(worldbooks.deletedAt)),
        )
        .orderBy(asc(worldbooks.name)),
      db
        .select({ id: promptPresets.id, name: promptPresets.name })
        .from(promptPresets)
        .where(
          and(
            eq(promptPresets.userId, userId),
            isNull(promptPresets.deletedAt),
          ),
        )
        .orderBy(asc(promptPresets.name)),
      db
        .select({ id: chatStyles.id, name: chatStyles.name })
        .from(chatStyles)
        .where(and(eq(chatStyles.userId, userId), isNull(chatStyles.deletedAt)))
        .orderBy(asc(chatStyles.name)),
      db
        .select({ id: outputSchemas.id, name: outputSchemas.name })
        .from(outputSchemas)
        .where(
          and(
            eq(outputSchemas.userId, userId),
            isNull(outputSchemas.deletedAt),
          ),
        )
        .orderBy(asc(outputSchemas.name)),
      db
        .select({ id: personas.id, name: personas.name })
        .from(personas)
        .where(and(eq(personas.userId, userId), isNull(personas.deletedAt)))
        .orderBy(asc(personas.name)),
      db
        .select({ id: themes.id, name: themes.name })
        .from(themes)
        .where(and(eq(themes.userId, userId), isNull(themes.deletedAt)))
        .orderBy(asc(themes.name)),
      db
        .select({ id: apiProviders.id, name: apiProviders.name })
        .from(apiProviders)
        .where(
          and(
            eq(apiProviders.userId, userId),
            isNull(apiProviders.deletedAt),
          ),
        )
        .orderBy(asc(apiProviders.name)),
    ]);

  return {
    characters: characterRows,
    worldbooks: worldbookRows,
    prompts: promptRows,
    styles: styleRows,
    schemas: schemaRows,
    personas: personaRows,
    themes: themeRows,
    providers: providerRows,
  };
}
