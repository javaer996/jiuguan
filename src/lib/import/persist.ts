import { v7 as uuidv7 } from "uuid";
import type { Database } from "@/db";
import {
  characters,
  worldbookEntries,
  worldbooks,
} from "@/db/schema";
import type {
  ImportedCharacter,
  ImportedWorldbook,
} from "@/lib/import/sillytavern";
import type { WorldbookEntryInput } from "@/lib/validation/content";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

function entryValues(worldbookId: string, entry: WorldbookEntryInput) {
  return {
    id: uuidv7(),
    worldbookId,
    uid: entry.uid ?? null,
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
  };
}

export async function insertWorldbook(
  tx: Transaction,
  userId: string,
  book: ImportedWorldbook,
): Promise<string> {
  const id = uuidv7();
  await tx.insert(worldbooks).values({
    id,
    userId,
    name: book.name,
    description: book.description,
    scanDepth: book.scanDepth,
    tokenBudget: book.tokenBudget,
    recursive: book.recursive,
  });
  await tx.insert(worldbookEntries).values(
    book.entries.map((entry) => entryValues(id, entry)),
  );
  return id;
}

export async function insertImportedCharacter(
  tx: Transaction,
  userId: string,
  imported: ImportedCharacter,
  avatarUrl: string | null,
): Promise<{ characterId: string; worldbookId: string | null }> {
  const characterId = uuidv7();
  const data = imported.input;

  await tx.insert(characters).values({
    id: characterId,
    userId,
    name: data.name,
    avatarUrl,
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
    extensions: imported.extensions,
    source: "import",
  });

  const worldbookId = imported.worldbook
    ? await insertWorldbook(tx, userId, imported.worldbook)
    : null;

  return { characterId, worldbookId };
}
