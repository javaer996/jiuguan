import type { ChatContext } from "@/lib/chat/context";
import { buildMemoryText } from "@/lib/chat/memory";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/content/defaults";
import { estimateTokens } from "@/lib/ai/tokens";
import type { PromptBlock, WorldbookEntrySnapshot } from "@/db/schema/types";

export { estimateTokens } from "@/lib/ai/tokens";

export type PromptMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type WorldbookHit = {
  entryId: string;
  name: string;
  tokens: number;
};

export type BuiltPrompt = {
  messages: PromptMessage[];
  hits: WorldbookHit[];
  estimatedTokens: number;
  maxTokens: number;
  temperature: number;
  topP: number;
  presencePenalty: number;
  frequencyPenalty: number;
  responseFormat:
    | { type: "json_object" }
    | {
        type: "json_schema";
        json_schema: {
          name: string;
          strict: boolean;
          schema: Record<string, unknown>;
        };
      }
    | null;
  schemaInstruction: string | null;
};

const DEFAULT_SCAN_DEPTH = 4;
const DEFAULT_CONTEXT_WINDOW = 8192;
const RESERVED_TOKENS = 320;

function applyVariables(text: string, variables: Record<string, string>) {
  return text.replace(/\{\{\s*([a-zA-Z0-9_一-龥]+)\s*\}\}/g, (match, key) => {
    return variables[key] ?? match;
  });
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsKey(
  haystack: string,
  key: string,
  wholeWords: boolean,
) {
  if (!key) return false;
  if (!wholeWords) return haystack.includes(key);
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}_])${escapeRegExp(key)}([^\\p{L}\\p{N}_]|$)`,
    "u",
  );
  return pattern.test(haystack);
}

function entryMatches(
  entry: WorldbookEntrySnapshot,
  text: string,
  bookCaseSensitive: boolean,
  bookWholeWords: boolean,
) {
  const caseSensitive = entry.caseSensitive ?? bookCaseSensitive;
  const wholeWords = entry.matchWholeWords ?? bookWholeWords;
  const haystack = caseSensitive ? text : text.toLowerCase();
  const keys = entry.keys.map((key) => (caseSensitive ? key : key.toLowerCase()));
  const secondary = (entry.secondaryKeys ?? []).map((key) =>
    caseSensitive ? key : key.toLowerCase(),
  );

  const primaryHit = keys.some((key) => containsKey(haystack, key, wholeWords));
  if (!primaryHit) return false;
  if (!entry.selective || secondary.length === 0) return true;

  const hits = secondary.map((key) => containsKey(haystack, key, wholeWords));
  switch (entry.selectiveLogic ?? "and_any") {
    case "and_all":
      return hits.every(Boolean);
    case "not_any":
      return hits.every((hit) => !hit);
    case "not_all":
      return !hits.every(Boolean);
    case "and_any":
    default:
      return hits.some(Boolean);
  }
}

function shouldRoll(entry: WorldbookEntrySnapshot) {
  if (!entry.useProbability) return true;
  const probability = entry.probability ?? 100;
  return Math.random() * 100 < probability;
}

function recentScanText(context: ChatContext, depth: number) {
  return context.branch
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-Math.max(1, depth))
    .map((message) => message.content)
    .join("\n");
}

function activateWorldbooks(context: ChatContext) {
  const hits: WorldbookHit[] = [];
  const activeByBook = new Map<string, Set<string>>();

  for (const { book, entries } of context.worldbooks) {
    const scanDepth = book.scanDepth ?? DEFAULT_SCAN_DEPTH;
    const historyText = recentScanText(context, scanDepth);
    const active = new Set<string>();
    const activatedContent: string[] = [];

    for (const entry of entries) {
      if (!entry.enabled) continue;
      const snapshot: WorldbookEntrySnapshot = {
        uid: entry.uid,
        name: entry.name,
        keys: entry.keys ?? [],
        secondaryKeys: entry.secondaryKeys ?? [],
        content: entry.content,
        constant: entry.constant,
        selective: entry.selective,
        selectiveLogic: entry.selectiveLogic,
        position: entry.position,
        depth: entry.depth,
        sortOrder: entry.sortOrder,
        probability: entry.probability,
        useProbability: entry.useProbability,
        enabled: entry.enabled,
        caseSensitive: entry.caseSensitive,
        matchWholeWords: entry.matchWholeWords,
        groupName: entry.groupName,
        groupWeight: entry.groupWeight,
        excludeRecursion: entry.excludeRecursion,
        preventRecursion: entry.preventRecursion,
      };

      if (!shouldRoll(snapshot)) continue;

      const constant = entry.constant;
      const matched =
        constant ||
        entryMatches(
          snapshot,
          historyText,
          book.caseSensitive,
          book.matchWholeWords,
        );

      if (matched) {
        active.add(entry.id);
        activatedContent.push(entry.content);
      }
    }

    if (book.recursive) {
      const maxDepth = book.maxRecursionDepth ?? 2;
      for (let depth = 0; depth < maxDepth; depth += 1) {
        const triggerText = activatedContent.join("\n");
        if (!triggerText) break;
        let added = false;

        for (const entry of entries) {
          if (active.has(entry.id) || !entry.enabled) continue;
          if (entry.preventRecursion) continue;
          if (!shouldRoll({
            name: entry.name,
            keys: entry.keys ?? [],
            content: entry.content,
          })) {
            continue;
          }

          const snapshot: WorldbookEntrySnapshot = {
            name: entry.name,
            keys: entry.keys ?? [],
            secondaryKeys: entry.secondaryKeys ?? [],
            content: entry.content,
            selective: entry.selective,
            selectiveLogic: entry.selectiveLogic,
            caseSensitive: entry.caseSensitive,
            matchWholeWords: entry.matchWholeWords,
          };

          if (
            entryMatches(
              snapshot,
              triggerText,
              book.caseSensitive,
              book.matchWholeWords,
            )
          ) {
            active.add(entry.id);
            activatedContent.push(entry.content);
            added = true;
          }
        }

        if (!added) break;
      }
    }

    activeByBook.set(book.id, active);
  }

  return { activeByBook, hits };
}

function worldbookSection(
  context: ChatContext,
  activeByBook: Map<string, Set<string>>,
  position: "top" | "before_char" | "after_char" | "bottom",
  variables: Record<string, string>,
  hits: WorldbookHit[],
) {
  const parts: string[] = [];
  let budget = Number.POSITIVE_INFINITY;

  for (const { book } of context.worldbooks) {
    if (book.tokenBudget && book.tokenBudget > 0) {
      budget = Math.min(budget, book.tokenBudget);
    }
  }

  let used = 0;
  for (const { book, entries } of context.worldbooks) {
    const active = activeByBook.get(book.id);
    if (!active || active.size === 0) continue;

    for (const entry of entries) {
      if (!active.has(entry.id)) continue;
      const entryPosition = entry.position ?? "after_char";
      const normalizedPosition =
        entryPosition === "before_char" ||
        entryPosition === "before_an"
          ? "before_char"
          : entryPosition === "after_an"
            ? "after_char"
            : entryPosition === "top"
              ? "top"
              : entryPosition === "bottom"
                ? "bottom"
                : "after_char";

      if (normalizedPosition !== position) continue;

      const content = applyVariables(entry.content, variables);
      const tokens = estimateTokens(content);
      if (used + tokens > budget) continue;
      used += tokens;
      parts.push(`【${entry.name}】\n${content}`);

      if (!hits.some((hit) => hit.entryId === entry.id)) {
        hits.push({ entryId: entry.id, name: entry.name, tokens });
      }
    }
  }

  return parts.join("\n\n");
}

function characterSection(context: ChatContext, variables: Record<string, string>) {
  const character = context.character;
  if (!character) return "";
  const parts: string[] = [`角色：${variables.char ?? character.name}`];
  if (character.description) parts.push(`简介：${character.description}`);
  if (character.personality) parts.push(`性格：${character.personality}`);
  if (character.scenario) parts.push(`场景：${character.scenario}`);
  if (character.exampleDialogue) {
    parts.push(`示例对话：\n${character.exampleDialogue}`);
  }
  return applyVariables(parts.join("\n"), variables);
}

function personaSection(context: ChatContext, variables: Record<string, string>) {
  const persona = context.persona;
  if (!persona) return "";
  const parts = [`{{user}} 的身份：${persona.name}`];
  if (persona.description) parts.push(persona.description);
  return applyVariables(parts.join("\n"), variables);
}

function schemaInstruction(context: ChatContext) {
  const schema = context.schema;
  if (!schema || schema.mode === "text") return null;

  const pretty = JSON.stringify(schema.schema, null, 2).slice(0, 12_000);
  const sample = schema.sample
    ? `\n示例：\n${JSON.stringify(schema.sample, null, 2).slice(0, 4_000)}`
    : "";

  return [
    "【输出格式】",
    "请只返回一个 JSON 对象，不要包裹代码块，也不要输出额外解释。",
    "返回结构必须符合下面的 JSON Schema：",
    pretty,
    sample,
  ]
    .filter(Boolean)
    .join("\n");
}

function blockContent(
  block: PromptBlock,
  sections: {
    char: string;
    persona: string;
    worldbook: string;
    authorNote: string;
  },
  variables: Record<string, string>,
) {
  switch (block.marker) {
    case "char":
      return sections.char;
    case "user":
    case "persona":
      return sections.persona;
    case "worldbook":
      return sections.worldbook;
    case "author_note":
      return sections.authorNote;
    case "chat_history":
      return null;
    default:
      return applyVariables(block.content, variables);
  }
}

export function buildChatPrompt(
  context: ChatContext,
  options: { userName: string },
): BuiltPrompt {
  const session = context.session;
  const settings = session.settings ?? {};
  const provider = context.provider;

  const userName = context.persona?.name || options.userName;
  const variables: Record<string, string> = {
    char: context.character?.name ?? "角色",
    user: userName,
    ...(context.preset?.variables ?? {}),
  };
  variables.char = context.character?.name ?? variables.char;
  variables.user = userName;

  const active = activateWorldbooks(context);
  const hits: WorldbookHit[] = [];

  const topWorldbook = worldbookSection(
    context,
    active.activeByBook,
    "top",
    variables,
    hits,
  );
  const beforeChar = worldbookSection(
    context,
    active.activeByBook,
    "before_char",
    variables,
    hits,
  );
  const afterChar = worldbookSection(
    context,
    active.activeByBook,
    "after_char",
    variables,
    hits,
  );
  const bottomWorldbook = worldbookSection(
    context,
    active.activeByBook,
    "bottom",
    variables,
    hits,
  );

  const charText = characterSection(context, variables);
  const personaText = personaSection(context, variables);
  const worldbookText = [topWorldbook, beforeChar, afterChar, bottomWorldbook]
    .filter(Boolean)
    .join("\n\n");

  const baseSystem = applyVariables(
    context.preset?.systemPrompt ??
      context.character?.systemPrompt ??
      DEFAULT_SYSTEM_PROMPT,
    variables,
  );

  const authorNote = settings.authorNote
    ? applyVariables(settings.authorNote, variables)
    : "";

  const postInstructions = applyVariables(
    context.preset?.postHistoryInstructions ??
      context.character?.postHistoryInstructions ??
      "",
    variables,
  );

  const schemaText = schemaInstruction(context);

  const contextWindow =
    settings.contextWindow ?? provider?.contextWindow ?? DEFAULT_CONTEXT_WINDOW;
  const memoryBudget = Math.min(
    3_000,
    Math.max(800, Math.floor(contextWindow * 0.12)),
  );
  const memoryText =
    settings.memoryEnabled === false
      ? ""
      : buildMemoryText(context.memories, memoryBudget);

  let compressionText = "";
  let historySource = context.branch;
  if (context.compression) {
    const cutoff = context.branch.findIndex(
      (message) => message.id === context.compression?.toMessageId,
    );
    // 摘要只覆盖当前分支的前缀；分支回溯后 toMessageId 不在路径上就忽略。
    if (cutoff >= 0) {
      compressionText = `【前情摘要】\n${context.compression.summary}`;
      historySource = context.branch.slice(cutoff + 1);
    }
  }

  const blocks = (context.preset?.blocks ?? []).filter(
    (block) => block.enabled,
  );
  const hasCharBlock = blocks.some((block) => block.marker === "char");
  const hasPersonaBlock = blocks.some(
    (block) => block.marker === "user" || block.marker === "persona",
  );
  const hasWorldbookBlock = blocks.some(
    (block) => block.marker === "worldbook",
  );
  const hasAuthorBlock = blocks.some(
    (block) => block.marker === "author_note",
  );

  const pre: PromptMessage[] = [];
  const post: PromptMessage[] = [];
  const depthInjections: { depth: number; message: PromptMessage }[] = [];

  // 基础系统提示词始终保留，避免预设漏掉核心人格设定。
  if (baseSystem.trim()) {
    pre.push({ role: "system", content: baseSystem.trim() });
  }
  if (memoryText.trim()) {
    pre.push({ role: "system", content: memoryText.trim() });
  }
  if (compressionText.trim()) {
    pre.push({ role: "system", content: compressionText.trim() });
  }

  if (!hasCharBlock && charText.trim()) {
    pre.push({ role: "system", content: charText.trim() });
  }
  if (!hasWorldbookBlock && worldbookText.trim()) {
    pre.push({ role: "system", content: worldbookText.trim() });
  }
  if (!hasPersonaBlock && personaText.trim()) {
    pre.push({ role: "system", content: personaText.trim() });
  }
  if (schemaText) {
    pre.push({ role: "system", content: schemaText });
  }

  for (const block of blocks) {
    if (block.marker === "chat_history") continue;

    const content = blockContent(
      block,
      {
        char: charText,
        persona: personaText,
        worldbook: worldbookText,
        authorNote,
      },
      variables,
    );
    if (!content || !content.trim()) continue;

    const message: PromptMessage = {
      role: block.role,
      content: content.trim(),
    };

    if (block.position === "post_history") {
      post.push(message);
    } else if (block.position === "depth") {
      depthInjections.push({ depth: block.depth ?? 4, message });
    } else {
      pre.push(message);
    }
  }

  if (postInstructions.trim()) {
    post.push({ role: "system", content: postInstructions.trim() });
  }
  if (authorNote.trim() && !hasAuthorBlock) {
    if (settings.authorNoteDepth == null) {
      post.push({
        role: "system",
        content: `【作者注】\n${authorNote.trim()}`,
      });
    } else {
      depthInjections.push({
        depth: settings.authorNoteDepth ?? 4,
        message: { role: "system", content: `【作者注】\n${authorNote.trim()}` },
      });
    }
  }

  // 按深度注入的世界书条目
  for (const { book, entries } of context.worldbooks) {
    const activeSet = active.activeByBook.get(book.id);
    if (!activeSet) continue;
    for (const entry of entries) {
      if (!activeSet.has(entry.id)) continue;
      if ((entry.position ?? "after_char") !== "at_depth") continue;
      const content = applyVariables(entry.content, variables);
      if (!content.trim()) continue;
      depthInjections.push({
        depth: entry.depth ?? 4,
        message: { role: "system", content: `【${entry.name}】\n${content}` },
      });
      const tokens = estimateTokens(content);
      if (!hits.some((hit) => hit.entryId === entry.id)) {
        hits.push({ entryId: entry.id, name: entry.name, tokens });
      }
    }
  }

  const historyAll = historySource
    .filter(
      (message) =>
        message.status === "complete" &&
        (message.role === "user" ||
          message.role === "assistant" ||
          message.role === "note"),
    )
    .map<PromptMessage>((message) =>
      message.role === "note"
        ? { role: "system", content: message.content }
        : { role: message.role as "user" | "assistant", content: message.content },
    );

  const maxMessages = Math.min(
    Math.max(settings.maxContextMessages ?? 40, 2),
    200,
  );
  const candidates = historyAll.slice(-maxMessages);

  const maxTokens = Math.min(
    settings.maxTokens ?? provider?.maxTokens ?? 2048,
    Math.max(contextWindow - 512, 256),
  );

  const fixedTokens =
    estimateTokens(
      [...pre, ...post].map((message) => message.content).join("\n"),
    ) + RESERVED_TOKENS;
  const available = Math.max(
    contextWindow - maxTokens - fixedTokens,
    512,
  );

  const selectedHistory: PromptMessage[] = [];
  let used = 0;
  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const message = candidates[index]!;
    const tokens = estimateTokens(message.content);
    if (
      selectedHistory.length >= 2 &&
      used + tokens > available
    ) {
      break;
    }
    selectedHistory.unshift(message);
    used += tokens;
  }

  const messages = [...pre, ...selectedHistory, ...post];
  const historyStart = pre.length;
  const historyEnd = pre.length + selectedHistory.length;

  depthInjections
    .sort((a, b) => b.depth - a.depth)
    .forEach(({ depth, message }) => {
      const index = Math.min(
        historyEnd,
        Math.max(historyStart, historyEnd - depth),
      );
      messages.splice(index, 0, message);
    });

  const responseFormat: BuiltPrompt["responseFormat"] =
    context.schema && context.schema.mode !== "text"
      ? context.schema.mode === "json_schema" &&
        provider?.capabilities?.jsonSchema !== false
        ? {
            type: "json_schema",
            json_schema: {
              name: "jiuguan_reply",
              strict: context.schema.strict ?? false,
              schema: context.schema.schema,
            },
          }
        : provider?.capabilities?.jsonMode === false
          ? null
          : { type: "json_object" }
      : null;

  return {
    messages,
    hits,
    estimatedTokens: estimateTokens(
      messages.map((message) => message.content).join("\n"),
    ),
    maxTokens,
    temperature: settings.temperature ?? provider?.temperature ?? 0.85,
    topP: settings.topP ?? provider?.topP ?? 1,
    presencePenalty:
      settings.presencePenalty ?? provider?.presencePenalty ?? 0,
    frequencyPenalty:
      settings.frequencyPenalty ?? provider?.frequencyPenalty ?? 0,
    responseFormat,
    schemaInstruction: schemaText,
  };
}
