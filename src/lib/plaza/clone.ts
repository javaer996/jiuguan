import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import {
  characters,
  chatStyles,
  chatTemplates,
  outputSchemas,
  personas,
  promptPresets,
  themes,
  worldbooks,
  worldbookEntries,
} from "@/db/schema";
import type { TemplateSnapshot } from "@/db/schema/types";
import { stripDebugMode } from "@/lib/chat/settings";

type CloneMeta = {
  title: string;
  description?: string | null;
  coverUrl?: string | null;
};

/**
 * 把广场快照复制成当前用户私有的一套资源与对话模板。
 * 快照内的名称会原样保留，方便用户直接开始对话。
 */
export async function cloneSnapshotToUser(
  userId: string,
  snapshot: TemplateSnapshot,
  meta: CloneMeta,
): Promise<string> {
  const db = getDb();

  return db.transaction(async (tx) => {
    const characterId = uuidv7();
    await tx.insert(characters).values({
      id: characterId,
      userId,
      name: snapshot.character.name.slice(0, 64),
      avatarUrl: snapshot.character.avatarUrl ?? null,
      tagline: snapshot.character.tagline ?? null,
      description: snapshot.character.description ?? null,
      personality: snapshot.character.personality ?? null,
      scenario: snapshot.character.scenario ?? null,
      firstMessage: snapshot.character.firstMessage ?? null,
      alternateGreetings: snapshot.character.alternateGreetings ?? null,
      exampleDialogue: snapshot.character.exampleDialogue ?? null,
      systemPrompt: snapshot.character.systemPrompt ?? null,
      postHistoryInstructions:
        snapshot.character.postHistoryInstructions ?? null,
      creatorNotes: snapshot.character.creatorNotes ?? null,
      tags: snapshot.character.tags ?? null,
      extensions: snapshot.character.extensions ?? null,
      source: "import",
    });

    const worldbookIds: string[] = [];
    for (const book of snapshot.worldbooks ?? []) {
      const worldbookId = uuidv7();
      worldbookIds.push(worldbookId);

      await tx.insert(worldbooks).values({
        id: worldbookId,
        userId,
        name: book.name.slice(0, 80),
        description: book.description ?? null,
        scanDepth: book.scanDepth ?? 4,
        tokenBudget: book.tokenBudget ?? 2048,
        recursive: book.recursive ?? false,
        maxRecursionDepth: book.maxRecursionDepth ?? 2,
        caseSensitive: book.caseSensitive ?? false,
        matchWholeWords: book.matchWholeWords ?? false,
      });

      if (book.entries.length > 0) {
        await tx.insert(worldbookEntries).values(
          book.entries.map((entry) => ({
            id: uuidv7(),
            worldbookId,
            uid: entry.uid ?? null,
            name: entry.name.slice(0, 128),
            keys: entry.keys ?? [],
            secondaryKeys: entry.secondaryKeys ?? null,
            content: entry.content,
            constant: entry.constant ?? false,
            selective: entry.selective ?? true,
            selectiveLogic: entry.selectiveLogic ?? "and_any",
            position: entry.position ?? "before_char",
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
      }
    }

    let promptPresetId: string | null = null;
    if (snapshot.promptPreset) {
      promptPresetId = uuidv7();
      await tx.insert(promptPresets).values({
        id: promptPresetId,
        userId,
        name: snapshot.promptPreset.name.slice(0, 80),
        description: snapshot.promptPreset.description ?? null,
        systemPrompt: snapshot.promptPreset.systemPrompt ?? null,
        postHistoryInstructions:
          snapshot.promptPreset.postHistoryInstructions ?? null,
        blocks: snapshot.promptPreset.blocks ?? null,
        variables: snapshot.promptPreset.variables ?? null,
        isDefault: false,
      });
    }

    let chatStyleId: string | null = null;
    if (snapshot.chatStyle) {
      chatStyleId = uuidv7();
      await tx.insert(chatStyles).values({
        id: chatStyleId,
        userId,
        name: snapshot.chatStyle.name.slice(0, 80),
        description: snapshot.chatStyle.description ?? null,
        builtInKey: snapshot.chatStyle.builtInKey ?? null,
        config: snapshot.chatStyle.config ?? null,
        customCss: snapshot.chatStyle.customCss ?? null,
      });
    }

    let themeId: string | null = null;
    if (snapshot.theme) {
      themeId = uuidv7();
      await tx.insert(themes).values({
        id: themeId,
        userId,
        name: snapshot.theme.name.slice(0, 80),
        description: snapshot.theme.description ?? null,
        tokens: snapshot.theme.tokens ?? null,
        customCss: snapshot.theme.customCss ?? null,
        backgroundUrl: snapshot.theme.backgroundUrl ?? null,
        mode: snapshot.theme.mode ?? "both",
        isDefault: false,
      });
    }

    let outputSchemaId: string | null = null;
    if (snapshot.outputSchema) {
      outputSchemaId = uuidv7();
      await tx.insert(outputSchemas).values({
        id: outputSchemaId,
        userId,
        name: snapshot.outputSchema.name.slice(0, 80),
        description: snapshot.outputSchema.description ?? null,
        schema: snapshot.outputSchema.schema,
        sample: snapshot.outputSchema.sample ?? null,
        mode: snapshot.outputSchema.mode ?? "json_object",
        strict: snapshot.outputSchema.strict ?? false,
        isDefault: false,
      });
    }

    let personaId: string | null = null;
    if (snapshot.persona) {
      personaId = uuidv7();
      await tx.insert(personas).values({
        id: personaId,
        userId,
        name: snapshot.persona.name.slice(0, 48),
        avatarUrl: snapshot.persona.avatarUrl ?? null,
        description: snapshot.persona.description ?? null,
        isDefault: false,
      });
    }

    const templateId = uuidv7();
    await tx.insert(chatTemplates).values({
      id: templateId,
      userId,
      name: meta.title.slice(0, 80),
      description: meta.description ?? snapshot.character.tagline ?? null,
      coverUrl: meta.coverUrl ?? snapshot.character.avatarUrl ?? null,
      characterId,
      worldbookIds,
      promptPresetId,
      chatStyleId,
      themeId,
      outputSchemaId,
      personaId,
      settings: stripDebugMode(snapshot.settings ?? null),
      greetingIndex: snapshot.greetingIndex ?? 0,
    });

    return templateId;
  });
}
