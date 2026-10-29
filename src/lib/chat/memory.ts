import { desc, eq } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { contextCompressions, sessionMemories } from "@/db/schema";
import type { ChatContext } from "@/lib/chat/context";
import { estimateTokens } from "@/lib/ai/tokens";
import { streamCompletion } from "@/lib/ai/openai";
import { decryptSecret } from "@/lib/crypto/secretbox";
import { ApiError } from "@/lib/api";
import type {
  ChatCompressionDTO,
  ChatMemoryDTO,
} from "@/lib/types/chat";

export type MemoryRow = typeof sessionMemories.$inferSelect;
export type CompressionRow = typeof contextCompressions.$inferSelect;
type MessageRow = ChatContext["allMessages"][number];

const MEMORY_LABELS: Record<MemoryRow["kind"], string> = {
  permanent: "永久",
  hidden: "隐藏",
  summary: "摘要",
  note: "笔记",
};

const MAX_MEMORY_BUDGET = 1_500;
const DEFAULT_KEEP_RECENT = 12;
const DEFAULT_THRESHOLD = 0.6;

export function toMemoryDTO(row: MemoryRow): ChatMemoryDTO {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    content: row.content,
    importance: row.importance,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toCompressionDTO(
  row: CompressionRow,
): ChatCompressionDTO {
  return {
    id: row.id,
    summary: row.summary,
    tokensBefore: row.tokensBefore,
    tokensAfter: row.tokensAfter,
    messageCount: row.messageCount,
    toMessageId: row.toMessageId,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * 摘要在创建时绑定当时的叶子节点。
 * 当前分支只有在该叶子仍是祖先时才沿用摘要；切换分支后自动失效。
 */
export function findApplicableCompression(
  rows: CompressionRow[],
  branchLeafId: string | null,
  allMessages: MessageRow[],
): CompressionRow | null {
  if (!branchLeafId || rows.length === 0) return null;

  const byId = new Map(allMessages.map((message) => [message.id, message]));
  const ancestors = new Set<string>();
  let cursor: string | null = branchLeafId;

  while (cursor && !ancestors.has(cursor)) {
    ancestors.add(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }

  return (
    [...rows]
      .filter((row) => ancestors.has(row.branchLeafId))
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ??
    null
  );
}

/** 把启用的记忆拼成一段 system 文本，按重要度截断到 token 预算内。 */
export function buildMemoryText(
  memories: MemoryRow[],
  budget = MAX_MEMORY_BUDGET,
) {
  const enabled = memories
    .filter((memory) => memory.enabled && memory.content.trim())
    .sort(
      (a, b) =>
        b.importance - a.importance ||
        b.updatedAt.getTime() - a.updatedAt.getTime(),
    );

  const parts: string[] = [];
  let used = 0;
  for (const memory of enabled) {
    const label = MEMORY_LABELS[memory.kind] ?? "记忆";
    const title = memory.title?.trim();
    const block = `[${label}]${title ? ` ${title}：` : " "}${memory.content.trim()}`;
    const tokens = estimateTokens(block);
    const remaining = budget - used;
    if (remaining <= 0) break;
    if (tokens > remaining) {
      const maxChars = Math.max(1, Math.floor(remaining * 1.7) - 1);
      const truncated = `${block.slice(0, maxChars)}…`;
      parts.push(truncated);
      used += estimateTokens(truncated);
      break;
    }
    used += tokens;
    parts.push(block);
  }

  return parts.length > 0 ? `【长期记忆】\n${parts.join("\n\n")}` : "";
}

function formatTranscript(messages: MessageRow[]) {
  return messages
    .map((message) => {
      if (message.role === "user") return `用户：${message.content}`;
      if (message.role === "assistant") return `角色：${message.content}`;
      return `旁白：${message.content}`;
    })
    .join("\n\n");
}

async function summarize(
  context: ChatContext,
  text: string,
  signal: AbortSignal | undefined,
  maxChars: number,
) {
  const provider = context.provider;
  if (!provider) {
    throw new ApiError(
      400,
      "NO_PROVIDER",
      "还没有可用的 AI 供应商，请先在设置中接入 OpenAI 兼容 API",
    );
  }

  const clipped =
    text.length > maxChars
      ? `（更早的细节已省略）\n${text.slice(-maxChars)}`
      : text;

  const system = [
    "你负责把 AI 角色扮演对话压缩成长期记忆摘要。",
    "只输出摘要正文，不要标题、JSON、代码块或解释。",
    "保留：人物与关系、地点、时间推进、关键事件、承诺与约定、未解决线索、重要物品。",
    "删除：寒暄、重复描写、无关紧要的细节。",
    "不要编造原文没有的信息，不要替用户做新的决定。",
    "用第三人称，300-600 个汉字。",
  ].join("\n");

  const prompt = `请压缩以下对话：\n\n${clipped}`;
  const apiKey = decryptSecret(provider.apiKeyEnc);
  let raw = "";

  for await (const event of streamCompletion({
    baseUrl: provider.baseUrl,
    apiKey,
    model: context.session.model ?? provider.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt },
    ],
    temperature: 0.3,
    topP: 1,
    maxTokens: 900,
    presencePenalty: 0,
    frequencyPenalty: 0,
    responseFormat: null,
    signal,
  })) {
    if (event.type === "delta") raw += event.content;
  }

  const summary = raw.trim();
  if (!summary) {
    throw new ApiError(502, "COMPRESSION_EMPTY", "AI 没有返回摘要内容");
  }
  return summary;
}

/**
 * 压缩当前分支的早期消息。
 * - 只处理 complete 的 user/assistant/note 消息
 * - 保留最近 compressionKeepRecent 条
 * - 已有摘要时做增量合并
 * - force=false 时按 token 阈值判断是否需要压缩
 */
export async function compressSession({
  context,
  force,
  signal,
}: {
  context: ChatContext;
  force: boolean;
  signal?: AbortSignal;
}): Promise<CompressionRow | null> {
  const session = context.session;
  const settings = session.settings ?? {};
  const provider = context.provider;

  if (!provider) {
    throw new ApiError(
      400,
      "NO_PROVIDER",
      "还没有可用的 AI 供应商，请先在设置中接入 OpenAI 兼容 API",
    );
  }

  const history = context.branch.filter(
    (message) =>
      message.status === "complete" &&
      (message.role === "user" ||
        message.role === "assistant" ||
        message.role === "note"),
  );

  const keepRecent = Math.min(
    Math.max(settings.compressionKeepRecent ?? DEFAULT_KEEP_RECENT, 2),
    100,
  );

  if (history.length <= keepRecent + 3) return null;

  const previous =
    context.compression &&
    context.branch.some(
      (message) => message.id === context.compression?.toMessageId,
    )
      ? context.compression
      : null;

  let startIndex = 0;
  if (previous?.toMessageId) {
    const index = history.findIndex(
      (message) => message.id === previous.toMessageId,
    );
    if (index >= 0) startIndex = index + 1;
  }

  const cutoffIndex = history.length - keepRecent;
  const newMessages = history.slice(startIndex, cutoffIndex);
  if (newMessages.length < 2) return null;

  const contextWindow =
    settings.contextWindow ?? provider.contextWindow ?? 8192;
  const maxTokens = Math.min(
    settings.maxTokens ?? provider.maxTokens ?? 2048,
    Math.max(contextWindow - 512, 256),
  );
  const available = Math.max(contextWindow - maxTokens - 320, 512);

  if (!force) {
    // 只看尚未被摘要覆盖的尾部，避免已有摘要后每轮都重复压缩。
    const tailTokens = estimateTokens(
      history
        .slice(startIndex)
        .map((message) => message.content)
        .join("\n"),
    );
    const threshold = settings.compressionThreshold ?? DEFAULT_THRESHOLD;
    if (tailTokens < Math.max(1024, available * threshold)) {
      return null;
    }
  }

  const transcript = formatTranscript(newMessages);
  const maxChars = Math.max(
    4_000,
    Math.floor(Math.max(available - 1_200, 1_000) * 1.6),
  );

  const summary = await summarize(
    {
      ...context,
      // 让摘要调用沿用当前会话的模型，但不继承输出格式。
    },
    previous?.summary
      ? `已有摘要：\n${previous.summary}\n\n新增对话：\n${transcript}\n\n请把已有摘要与新增对话合并成一份更新后的摘要。`
      : transcript,
    signal,
    maxChars,
  );

  const branchLeafId =
    context.branch.at(-1)?.id ?? session.activeLeafId ?? newMessages.at(-1)!.id;
  const id = uuidv7();
  const row = {
    id,
    sessionId: session.id,
    branchLeafId,
    fromMessageId: previous?.fromMessageId ?? newMessages[0]!.id,
    toMessageId: newMessages.at(-1)!.id,
    summary,
    tokensBefore: estimateTokens(
      `${previous?.summary ?? ""}\n${transcript}`,
    ),
    tokensAfter: estimateTokens(summary),
    messageCount:
      (previous?.messageCount ?? 0) + newMessages.length,
  };

  await getDb().insert(contextCompressions).values(row);

  const [inserted] = await getDb()
    .select()
    .from(contextCompressions)
    .where(eq(contextCompressions.id, id))
    .limit(1);

  return inserted ?? null;
}

export async function maybeAutoCompress(
  context: ChatContext,
  signal?: AbortSignal,
) {
  if (context.session.settings?.compressionEnabled !== true) return null;
  return compressSession({ context, force: false, signal });
}

export async function loadCompressionRows(sessionId: string) {
  return getDb()
    .select()
    .from(contextCompressions)
    .where(eq(contextCompressions.sessionId, sessionId))
    .orderBy(desc(contextCompressions.createdAt))
    .limit(20);
}
