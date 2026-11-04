import type { ChatContext } from "@/lib/chat/context";
import { buildMemoryText } from "@/lib/chat/memory";
import { applyChatVariables } from "@/lib/chat/variables";
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

type WorldbookEntryRow = ChatContext["worldbooks"][number]["entries"][number];

type WorldbookSectionPosition =
  | "top"
  | "before_char"
  | "after_char"
  | "before_an"
  | "after_an"
  | "bottom";

type WorldbookBudget = {
  limit: number;
  used: number;
};

function toEntrySnapshot(entry: WorldbookEntryRow): WorldbookEntrySnapshot {
  return {
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
    delayUntilRecursion: entry.delayUntilRecursion,
    scanDepth: entry.scanDepth,
    tokenBudget: entry.tokenBudget,
  };
}

/** 同组条目最终只保留一个，按权重随机选择；常驻条目不参与互斥。 */
function applyInclusionGroups(
  entries: WorldbookEntryRow[],
  activeEntries: Map<string, WorldbookEntryRow>,
) {
  const groups = new Map<string, WorldbookEntryRow[]>();

  for (const entry of entries) {
    if (!entry.groupName || entry.constant || !activeEntries.has(entry.id)) {
      continue;
    }
    const list = groups.get(entry.groupName) ?? [];
    list.push(entry);
    groups.set(entry.groupName, list);
  }

  for (const list of groups.values()) {
    if (list.length <= 1) continue;
    const total = list.reduce(
      (sum, entry) => sum + Math.max(0, entry.groupWeight),
      0,
    );
    let picked = list[0]!;
    if (total > 0) {
      let roll = Math.random() * total;
      for (const entry of list) {
        roll -= Math.max(0, entry.groupWeight);
        if (roll <= 0) {
          picked = entry;
          break;
        }
      }
    }
    for (const entry of list) {
      if (entry.id !== picked.id) activeEntries.delete(entry.id);
    }
  }
}

function activateWorldbooks(context: ChatContext) {
  const activeByBook = new Map<string, Set<string>>();

  for (const { book, entries } of context.worldbooks) {
    const bookScanDepth = book.scanDepth ?? DEFAULT_SCAN_DEPTH;
    const scanCache = new Map<number, string>();
    const scanTextFor = (depth: number | null | undefined) => {
      // 0 和 1 都至少扫描最新一条消息，避免 slice(-0) 变成扫描全部历史。
      const normalized = Math.max(1, depth ?? bookScanDepth);
      const cached = scanCache.get(normalized);
      if (cached !== undefined) return cached;
      const text = recentScanText(context, normalized);
      scanCache.set(normalized, text);
      return text;
    };

    const activeEntries = new Map<string, WorldbookEntryRow>();

    for (const entry of entries) {
      if (!entry.enabled || entry.delayUntilRecursion) continue;
      const snapshot = toEntrySnapshot(entry);
      if (!shouldRoll(snapshot)) continue;
      const scanText = scanTextFor(entry.scanDepth);
      const matched =
        entry.constant ||
        entryMatches(
          snapshot,
          scanText,
          book.caseSensitive,
          book.matchWholeWords,
        );
      if (matched) activeEntries.set(entry.id, entry);
    }

    if (book.recursive) {
      const maxDepth = book.maxRecursionDepth ?? 2;
      for (let round = 0; round < maxDepth; round += 1) {
        // 阻止递归的条目可以注入，但它的内容不再作为下一轮触发文本。
        const triggerText = [...activeEntries.values()]
          .filter((entry) => !entry.preventRecursion)
          .map((entry) => entry.content)
          .join("\n");
        if (!triggerText) break;

        let added = false;
        for (const entry of entries) {
          if (activeEntries.has(entry.id) || !entry.enabled) continue;
          if (entry.excludeRecursion) continue;
          const snapshot = toEntrySnapshot(entry);
          if (!shouldRoll(snapshot)) continue;
          if (
            entry.constant ||
            entryMatches(
              snapshot,
              triggerText,
              book.caseSensitive,
              book.matchWholeWords,
            )
          ) {
            activeEntries.set(entry.id, entry);
            added = true;
          }
        }

        if (!added) break;
      }
    }

    applyInclusionGroups(entries, activeEntries);
    activeByBook.set(book.id, new Set(activeEntries.keys()));
  }

  return { activeByBook };
}

function normalizeWorldbookPosition(
  position: string | undefined,
): WorldbookSectionPosition | "at_depth" {
  switch (position) {
    case "top":
    case "before_char":
    case "after_char":
    case "before_an":
    case "after_an":
    case "at_depth":
    case "bottom":
      return position;
    default:
      return "after_char";
  }
}

function createWorldbookBudget(context: ChatContext): WorldbookBudget {
  let limit = Number.POSITIVE_INFINITY;
  for (const { book } of context.worldbooks) {
    if (book.tokenBudget && book.tokenBudget > 0) {
      limit = Math.min(limit, book.tokenBudget);
    }
  }
  return { limit, used: 0 };
}

function worldbookSection(
  context: ChatContext,
  activeByBook: Map<string, Set<string>>,
  position: WorldbookSectionPosition,
  variables: Record<string, string>,
  hits: WorldbookHit[],
  budget: WorldbookBudget,
) {
  const parts: string[] = [];

  for (const { book, entries } of context.worldbooks) {
    const active = activeByBook.get(book.id);
    if (!active || active.size === 0) continue;

    for (const entry of entries) {
      if (!active.has(entry.id)) continue;
      if (normalizeWorldbookPosition(entry.position) !== position) continue;

      const content = applyVariables(entry.content, variables);
      if (!content.trim()) continue;
      const tokens = estimateTokens(content);
      const entryLimit =
        entry.tokenBudget && entry.tokenBudget > 0
          ? entry.tokenBudget
          : budget.limit;
      if (tokens > entryLimit) continue;
      if (budget.used + tokens > budget.limit) continue;
      budget.used += tokens;
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
  options: {
    userName: string;
    /** 主回复末尾附带的互动信息输出规则 */
    interactionInstruction?: string;
  },
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
  const worldbookBudget = createWorldbookBudget(context);

  const authorNote = settings.authorNote
    ? applyVariables(settings.authorNote, variables)
    : "";
  const hasAuthorNote = Boolean(authorNote.trim());
  const authorNoteDepth =
    settings.authorNoteMode === "custom"
      ? settings.authorNoteDepth ?? 4
      : undefined;

  const topWorldbook = worldbookSection(
    context,
    active.activeByBook,
    "top",
    variables,
    hits,
    worldbookBudget,
  );
  const beforeChar = worldbookSection(
    context,
    active.activeByBook,
    "before_char",
    variables,
    hits,
    worldbookBudget,
  );
  const afterChar = worldbookSection(
    context,
    active.activeByBook,
    "after_char",
    variables,
    hits,
    worldbookBudget,
  );
  const bottomWorldbook = worldbookSection(
    context,
    active.activeByBook,
    "bottom",
    variables,
    hits,
    worldbookBudget,
  );
  const beforeAnWorldbook = worldbookSection(
    context,
    active.activeByBook,
    "before_an",
    variables,
    hits,
    worldbookBudget,
  );
  const afterAnWorldbook = worldbookSection(
    context,
    active.activeByBook,
    "after_an",
    variables,
    hits,
    worldbookBudget,
  );

  const charText = characterSection(context, variables);
  const personaText = personaSection(context, variables);
  const worldbookText = [
    topWorldbook,
    beforeChar,
    // 没有作者注时，before_an / after_an 退回角色设定前后。
    hasAuthorNote ? "" : beforeAnWorldbook,
    afterChar,
    hasAuthorNote ? "" : afterAnWorldbook,
    bottomWorldbook,
  ]
    .filter(Boolean)
    .join("\n\n");

  const baseSystem = applyVariables(
    context.preset?.systemPrompt ??
      context.character?.systemPrompt ??
      DEFAULT_SYSTEM_PROMPT,
    variables,
  );

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
  let authorNoteMessage: PromptMessage | null = null;

  // 基础系统提示词始终保留，避免预设漏掉核心人格设定。
  if (baseSystem.trim()) {
    pre.push({ role: "system", content: baseSystem.trim() });
  }
  if (memoryText.trim()) {
    pre.push({
      role: "system",
      content: applyChatVariables(memoryText, {
        char: variables.char,
        user: variables.user,
      }).trim(),
    });
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
    // 对话设置里指定了作者注深度时，预设里的作者注块只作为“存在”标记，
    // 不再重复注入；由下面的统一逻辑按指定深度插入一次。
    if (block.marker === "author_note" && authorNoteDepth != null) continue;

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

    if (block.marker === "author_note") {
      authorNoteMessage = message;
    }
  }

  if (postInstructions.trim()) {
    post.push({ role: "system", content: postInstructions.trim() });
  }

  if (authorNote.trim()) {
    if (authorNoteDepth != null) {
      const message: PromptMessage = {
        role: "system",
        content: `【作者注】\n${authorNote.trim()}`,
      };
      depthInjections.push({ depth: authorNoteDepth, message });
      authorNoteMessage = message;
    } else if (!hasAuthorBlock) {
      const message: PromptMessage = {
        role: "system",
        content: `【作者注】\n${authorNote.trim()}`,
      };
      post.push(message);
      authorNoteMessage = message;
    }
  }

  // 互动信息跟随主回复一起生成，放在最后提醒模型只追加隐藏区块。
  const interactionInstruction = options.interactionInstruction?.trim();
  if (interactionInstruction) {
    post.push({ role: "system", content: interactionInstruction });
  }

  // 按深度注入的世界书条目
  for (const { book, entries } of context.worldbooks) {
    const activeSet = active.activeByBook.get(book.id);
    if (!activeSet) continue;
    for (const entry of entries) {
      if (!activeSet.has(entry.id)) continue;
      if (normalizeWorldbookPosition(entry.position) !== "at_depth") continue;
      const content = applyVariables(entry.content, variables);
      if (!content.trim()) continue;
      const tokens = estimateTokens(content);
      const entryLimit =
        entry.tokenBudget && entry.tokenBudget > 0
          ? entry.tokenBudget
          : worldbookBudget.limit;
      if (tokens > entryLimit) continue;
      if (worldbookBudget.used + tokens > worldbookBudget.limit) continue;
      worldbookBudget.used += tokens;
      depthInjections.push({
        depth: entry.depth ?? 4,
        message: { role: "system", content: `【${entry.name}】\n${content}` },
      });
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
    .map<PromptMessage>((message) => {
      // 开场白与历史消息可能保留 {{user}} / {{char}} 占位符，发给模型前替换。
      const content = applyChatVariables(message.content, {
        char: variables.char,
        user: variables.user,
      });
      return message.role === "note"
        ? { role: "system", content }
        : { role: message.role as "user" | "assistant", content };
    });

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
      [
        ...pre,
        ...post,
        ...depthInjections.map((injection) => injection.message),
      ]
        .map((message) => message.content)
        .join("\n"),
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

  // before_an / after_an 真正贴近作者注消息，而不是简单并入角色设定前后。
  if (hasAuthorNote && authorNoteMessage) {
    const index = messages.indexOf(authorNoteMessage);
    if (index >= 0) {
      if (afterAnWorldbook.trim()) {
        messages.splice(index + 1, 0, {
          role: "system",
          content: afterAnWorldbook.trim(),
        });
      }
      if (beforeAnWorldbook.trim()) {
        messages.splice(index, 0, {
          role: "system",
          content: beforeAnWorldbook.trim(),
        });
      }
    }
  }

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
