import extractChunks from "png-chunks-extract";
import { decode as decodeTextChunk } from "png-chunk-text";
import { ApiError } from "@/lib/api";
import {
  characterInputSchema,
  worldbookEntryInputSchema,
  type CharacterInput,
  type WorldbookEntryInput,
} from "@/lib/validation/content";

type JsonRecord = Record<string, unknown>;

export type ImportedWorldbook = {
  name: string;
  description: string | null;
  scanDepth: number;
  tokenBudget: number;
  recursive: boolean;
  entries: WorldbookEntryInput[];
};

export type ImportedCharacter = {
  input: CharacterInput;
  extensions: Record<string, unknown> | null;
  worldbook: ImportedWorldbook | null;
  cardAvatarUrl: string | null;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asBoolean(value: unknown): boolean {
  return value === true || value === "true" || value === 1;
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const parsed = asNumber(value);
  if (parsed === null) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function safeBase64Json(text: string): unknown {
  const cleaned = text.replace(/\s+/g, "");
  if (!/^[A-Za-z0-9+/=_-]+$/.test(cleaned)) return null;
  try {
    const normalized = cleaned.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      "=",
    );
    const decoded = Buffer.from(padded, "base64").toString("utf8").trim();
    if (!decoded.startsWith("{") && !decoded.startsWith("[")) return null;
    return JSON.parse(decoded) as unknown;
  } catch {
    return null;
  }
}

function decodeCardText(text: string): unknown {
  const trimmed = text.trim();
  const candidates: string[] = [trimmed];

  const base64 = safeBase64Json(trimmed);
  if (base64 !== null) return base64;

  try {
    const decoded = decodeURIComponent(trimmed);
    if (decoded !== trimmed) {
      candidates.push(decoded);
      const uriBase64 = safeBase64Json(decoded);
      if (uriBase64 !== null) return uriBase64;
    }
  } catch {
    // 忽略非法的 URI 编码
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (isRecord(parsed)) return parsed;
    } catch {
      // 继续尝试下一种编码
    }
  }
  return null;
}

/** 从 PNG 的 tEXt 块中读取 SillyTavern 角色卡（优先 ccv3，其次 chara）。 */
export function extractCardFromPng(buffer: Buffer): JsonRecord {
  let chunks: { name: string; data: Uint8Array }[];
  try {
    chunks = extractChunks(new Uint8Array(buffer));
  } catch {
    throw new ApiError(400, "INVALID_PNG", "PNG 文件损坏或格式不正确");
  }

  const texts = new Map<string, string>();
  for (const chunk of chunks) {
    if (chunk.name !== "tEXt") continue;
    try {
      const { keyword, text } = decodeTextChunk(chunk.data);
      if (keyword && text) texts.set(keyword.toLowerCase(), text);
    } catch {
      // 跳过无法解码的文本块
    }
  }

  for (const key of ["ccv3", "chara"]) {
    const text = texts.get(key);
    if (!text) continue;
    const parsed = decodeCardText(text);
    if (isRecord(parsed)) return parsed;
  }

  throw new ApiError(
    400,
    "NO_CARD_DATA",
    "这张 PNG 中没有找到 SillyTavern 角色卡数据",
  );
}

const POSITION_MAP: Record<string, WorldbookEntryInput["position"]> = {
  "0": "before_char",
  "1": "after_char",
  "2": "before_an",
  "3": "after_an",
  "4": "at_depth",
  before_char: "before_char",
  after_char: "after_char",
  before_an: "before_an",
  after_an: "after_an",
  at_depth: "at_depth",
  top: "top",
  bottom: "bottom",
};

const SELECTIVE_LOGIC_MAP: Record<
  string,
  WorldbookEntryInput["selectiveLogic"]
> = {
  "0": "and_any",
  "1": "and_all",
  "2": "not_all",
  "3": "not_any",
  and_any: "and_any",
  and_all: "and_all",
  not_all: "not_all",
  not_any: "not_any",
};

function normalizeEntry(
  raw: JsonRecord,
  index: number,
): WorldbookEntryInput | null {
  const content = asString(raw.content);
  if (!content) return null;

  const keys = asStringArray(raw.key ?? raw.keys);
  const secondaryKeys = asStringArray(raw.keysecondary ?? raw.secondaryKeys);
  const name =
    asString(raw.comment) ||
    asString(raw.name) ||
    keys[0] ||
    `条目 ${index + 1}`;

  const rawPosition =
    raw.position === undefined || raw.position === null
      ? "after_char"
      : String(raw.position);
  const rawLogic =
    raw.selectiveLogic === undefined || raw.selectiveLogic === null
      ? "and_any"
      : String(raw.selectiveLogic);

  const candidate = {
    uid: raw.uid !== undefined && raw.uid !== null ? String(raw.uid) : null,
    name,
    keys,
    secondaryKeys,
    content,
    constant: asBoolean(raw.constant),
    selective: raw.selective === undefined ? true : asBoolean(raw.selective),
    selectiveLogic: SELECTIVE_LOGIC_MAP[rawLogic] ?? "and_any",
    position: POSITION_MAP[rawPosition] ?? "after_char",
    depth: clampInt(raw.depth, 4, 0, 100),
    sortOrder: clampInt(raw.order ?? raw.sortOrder, 100, -100_000, 100_000),
    probability: clampInt(raw.probability, 100, 0, 100),
    useProbability:
      raw.useProbability === undefined ? true : asBoolean(raw.useProbability),
    enabled: raw.disable === undefined ? raw.enabled !== false : !asBoolean(raw.disable),
    caseSensitive: asBoolean(raw.caseSensitive),
    matchWholeWords: asBoolean(raw.matchWholeWords),
    groupName: asString(raw.group ?? raw.groupName) || null,
    groupWeight: clampInt(raw.groupWeight, 100, 0, 10_000),
    excludeRecursion: asBoolean(raw.excludeRecursion),
    preventRecursion: asBoolean(raw.preventRecursion),
    delayUntilRecursion: asBoolean(raw.delayUntilRecursion),
    scanDepth: asNumber(raw.scanDepth),
    tokenBudget: asNumber(raw.tokenBudget),
    extensions: isRecord(raw.extensions) ? raw.extensions : null,
  };

  const parsed = worldbookEntryInputSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(
      400,
      "INVALID_WORLDBOOK_ENTRY",
      `第 ${index + 1} 个世界书条目不合法：${issue?.message ?? "字段错误"}`,
    );
  }
  return parsed.data;
}

/** 解析 SillyTavern 世界书 JSON，也兼容角色卡内的 character_book。 */
export function normalizeWorldbook(
  raw: unknown,
  fallbackName = "导入的世界书",
): ImportedWorldbook {
  if (!isRecord(raw)) {
    throw new ApiError(400, "INVALID_WORLDBOOK", "世界书内容不是对象");
  }

  const entriesRaw = raw.entries;
  const list = Array.isArray(entriesRaw)
    ? entriesRaw
    : isRecord(entriesRaw)
      ? Object.values(entriesRaw)
      : [];

  if (list.length === 0) {
    throw new ApiError(400, "EMPTY_WORLDBOOK", "世界书里没有条目");
  }
  if (list.length > 300) {
    throw new ApiError(400, "WORLDBOOK_TOO_LARGE", "一次最多导入 300 个条目");
  }

  const entries = list
    .map((entry, index) =>
      isRecord(entry) ? normalizeEntry(entry, index) : null,
    )
    .filter((entry): entry is WorldbookEntryInput => entry !== null);

  if (entries.length === 0) {
    throw new ApiError(400, "EMPTY_WORLDBOOK", "世界书里没有有效条目");
  }

  const name = (asString(raw.name) || fallbackName).slice(0, 80);
  const description = asString(raw.description).slice(0, 20_000) || null;

  return {
    name,
    description,
    scanDepth: clampInt(raw.scanDepth, 4, 0, 50),
    tokenBudget: clampInt(raw.tokenBudget, 2048, 0, 100_000),
    recursive: asBoolean(raw.recursive),
    entries,
  };
}

/** 解析 V1 / V2 / V3 SillyTavern 角色卡 JSON。 */
export function normalizeCharacterCard(raw: unknown): ImportedCharacter {
  if (!isRecord(raw)) {
    throw new ApiError(400, "INVALID_CARD", "角色卡内容不是对象");
  }

  const data = isRecord(raw.data) ? raw.data : raw;
  const name = asString(data.name) || asString(raw.name);
  if (!name) {
    throw new ApiError(400, "INVALID_CARD", "角色卡缺少角色名");
  }

  const avatarCandidate =
    asString(data.avatar) || asString(raw.avatar) || asString(raw.avatar_url);
  const cardAvatarUrl = /^https?:\/\//i.test(avatarCandidate)
    ? avatarCandidate.slice(0, 1024)
    : null;

  const candidate = {
    name: name.slice(0, 64),
    avatarUrl: cardAvatarUrl,
    tagline: asString(data.tagline).slice(0, 160) || null,
    description: asString(data.description) || null,
    personality: asString(data.personality) || null,
    scenario: asString(data.scenario) || null,
    firstMessage:
      asString(data.first_mes) || asString(data.firstMessage) || null,
    alternateGreetings: asStringArray(
      data.alternate_greetings ?? data.alternateGreetings,
    )
      .slice(0, 20)
      .map((item) => item.slice(0, 10_000)),
    exampleDialogue:
      asString(data.mes_example) || asString(data.exampleDialogue) || null,
    systemPrompt:
      asString(data.system_prompt) || asString(data.systemPrompt) || null,
    postHistoryInstructions:
      asString(data.post_history_instructions) ||
      asString(data.postHistoryInstructions) ||
      null,
    creatorNotes:
      asString(data.creator_notes) ||
      asString(data.creatorcomment) ||
      asString(data.creatorNotes) ||
      null,
    tags: asStringArray(data.tags)
      .slice(0, 20)
      .map((tag) => tag.slice(0, 32)),
    source: "import" as const,
  };

  const parsed = characterInputSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    throw new ApiError(
      400,
      "INVALID_CARD",
      `角色卡字段不合法：${issue?.message ?? "字段错误"}`,
    );
  }

  const bookRaw = isRecord(data.character_book)
    ? data.character_book
    : isRecord(raw.character_book)
      ? raw.character_book
      : null;

  return {
    input: parsed.data,
    extensions: isRecord(data.extensions)
      ? data.extensions
      : isRecord(raw.extensions)
        ? raw.extensions
        : null,
    worldbook: bookRaw
      ? normalizeWorldbook(bookRaw, `${parsed.data.name}的世界书`)
      : null,
    cardAvatarUrl,
  };
}

export function parseJsonBuffer(buffer: Buffer): unknown {
  const text = buffer.toString("utf8").replace(/^﻿/, "").trim();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(400, "INVALID_JSON", "文件不是合法的 JSON");
  }
}

/** 判断一份 JSON 是否像角色卡（而不是世界书）。 */
export function looksLikeCharacterCard(raw: unknown): boolean {
  if (!isRecord(raw)) return false;
  if (typeof raw.spec === "string" && raw.spec.startsWith("chara_card")) {
    return true;
  }
  // 世界书通常也带 name/description，不能仅凭这两个字段判断为角色卡。
  if (raw.entries !== undefined) return false;

  const data = isRecord(raw.data) ? raw.data : raw;
  if (data.entries !== undefined) return false;

  return (
    Boolean(asString(data.name)) &&
    (Boolean(asString(data.first_mes)) ||
      Boolean(asString(data.firstMessage)) ||
      Boolean(asString(data.personality)) ||
      Boolean(asString(data.scenario)) ||
      Boolean(asString(data.mes_example)) ||
      Boolean(asString(data.system_prompt)) ||
      isRecord(data.character_book))
  );
}

/** 从世界书 JSON 或角色卡中取出可导入的世界书。 */
export function extractWorldbook(raw: unknown): ImportedWorldbook {
  if (!isRecord(raw)) {
    throw new ApiError(400, "INVALID_WORLDBOOK", "世界书内容不是对象");
  }
  if (isRecord(raw.character_book)) {
    return normalizeWorldbook(raw.character_book, "角色附带世界书");
  }
  if (isRecord(raw.data) && isRecord(raw.data.character_book)) {
    return normalizeWorldbook(raw.data.character_book, "角色附带世界书");
  }
  if (raw.entries !== undefined) {
    return normalizeWorldbook(raw);
  }
  if (isRecord(raw.data) && raw.data.entries !== undefined) {
    return normalizeWorldbook(raw.data);
  }
  throw new ApiError(400, "INVALID_WORLDBOOK", "没有找到世界书条目");
}
