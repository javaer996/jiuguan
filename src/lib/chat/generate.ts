import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { chatSessions, messages } from "@/db/schema";
import type { ChatAids, MessageMetadata } from "@/db/schema/types";
import { buildChatPrompt, estimateTokens } from "@/lib/ai/prompt";
import { maybeAutoCompress } from "@/lib/chat/memory";
import { streamCompletion } from "@/lib/ai/openai";
import { decryptSecret } from "@/lib/crypto/secretbox";
import { getAjv } from "@/lib/schema/validate";
import type { ChatContext } from "@/lib/chat/context";
import {
  parseGeneratedAids,
  isAidsComplete,
} from "@/lib/chat/aids";
import { resolveAidsConfig } from "@/lib/chat/aids-config";
import { buildAidsOutputInstruction } from "@/lib/chat/aids-prompt";
import { createAidsStreamFilter } from "@/lib/chat/aids-stream";
import {
  toChatMessageDTO,
  toChatSessionDTO,
} from "@/lib/chat/serializers";
import type { ChatStreamDone, ChatStreamMeta } from "@/lib/types/chat";

type AssistantStreamArgs = {
  context: ChatContext;
  assistantId: string;
  parentId: string | null;
  userName: string;
  requestSignal: AbortSignal;
};

const encoder = new TextEncoder();

function sse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

function stripCodeFence(raw: string) {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function parseStructured(
  raw: string,
  schema: Record<string, unknown> | null,
) {
  if (!schema) return { structured: null, valid: true, errors: [] as string[] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFence(raw));
  } catch {
    return {
      structured: null,
      valid: false,
      errors: ["返回内容不是合法 JSON"],
    };
  }

  try {
    const validate = getAjv().compile(schema);
    const valid = Boolean(validate(parsed));
    const errors = valid
      ? []
      : (validate.errors ?? []).slice(0, 8).map((error) => {
          const path = error.instancePath || "/";
          return `${path} ${error.message ?? "不符合 Schema"}`;
        });
    return { structured: parsed, valid, errors };
  } catch {
    return {
      structured: parsed,
      valid: false,
      errors: ["输出格式的 Schema 无法编译"],
    };
  }
}

function autoTitle(content: string) {
  const line = content.replace(/\s+/g, " ").trim();
  return line.length > 30 ? `${line.slice(0, 30)}…` : line || "新的对话";
}

async function loadSiblingIds(
  sessionId: string,
  parentId: string | null,
) {
  const rows = await getDb()
    .select({ id: messages.id })
    .from(messages)
    .where(
      and(
        eq(messages.sessionId, sessionId),
        parentId ? eq(messages.parentId, parentId) : isNull(messages.parentId),
      ),
    )
    .orderBy(messages.createdAt, messages.id);

  return rows.map((row) => row.id);
}

async function finalizeError(
  assistantId: string,
  partial: string,
  message: string,
  cancelled: boolean,
  sessionId: string,
  parentId: string | null,
) {
  const metadata: MessageMetadata = {
    error: message,
    ...(cancelled ? { cancelled: true } : {}),
  };

  await getDb()
    .update(messages)
    .set({
      content: partial,
      rawContent: partial || null,
      status: cancelled ? "cancelled" : "error",
      metadata,
      tokensOut: partial ? estimateTokens(partial) : null,
    })
    .where(eq(messages.id, assistantId));

  if (parentId) {
    await getDb()
      .update(messages)
      .set({ activeChildId: assistantId })
      .where(eq(messages.id, parentId));
  }

  await getDb()
    .update(chatSessions)
    .set({ activeLeafId: assistantId, lastMessageAt: new Date() })
    .where(eq(chatSessions.id, sessionId));
}

export function createAssistantStream({
  context,
  assistantId,
  parentId,
  userName,
  requestSignal,
}: AssistantStreamArgs): Response {
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  requestSignal.addEventListener("abort", onAbort, { once: true });

  const stream = new ReadableStream<Uint8Array>({
    async start(streamController) {
      let closed = false;
      let partial = "";
      let raw = "";

      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          streamController.enqueue(sse(event, data));
        } catch {
          closed = true;
        }
      };

      const close = () => {
        if (closed) return;
        closed = true;
        try {
          streamController.close();
        } catch {
          // 客户端已断开
        }
      };

      const provider = context.provider;
      const meta: ChatStreamMeta = {
        sessionId: context.session.id,
        assistantId,
        userMessage: null,
        providerName: provider?.name ?? null,
        model: context.session.model ?? provider?.model ?? null,
      };
      send("meta", meta);

      if (!provider) {
        const message =
          "还没有可用的 AI 供应商。请先在设置中接入 OpenAI 兼容 API。";
        await finalizeError(
          assistantId,
          "",
          message,
          false,
          context.session.id,
          parentId,
        );
        send("error", { message });
        requestSignal.removeEventListener("abort", onAbort);
        close();
        return;
      }

      const startedAt = Date.now();

      try {
        // 自动压缩失败不能影响正常回复，回退到截断策略。
        const compressed = await maybeAutoCompress(
          context,
          controller.signal,
        ).catch(() => null);
        if (compressed) context.compression = compressed;

        const aidsConfig = resolveAidsConfig(context.style?.config);
        const aidsEnabled =
          aidsConfig.enabledStatus ||
          aidsConfig.enabledGoal ||
          aidsConfig.enabledOptions;
        // 结构化输出需要整段 JSON，无法安全夹带隐藏区块，保留原来的单独生成兜底。
        // 「纯文本」格式并没有限制返回结构，仍然可以和主回复合并。
        const hasStructuredOutput = Boolean(
          context.schema && context.schema.mode !== "text",
        );
        const combineAids = aidsEnabled && !hasStructuredOutput;
        const aidsFilter = combineAids ? createAidsStreamFilter() : null;
        // 把上一轮结构化状态带回提示词，避免好感度、地点等信息每轮被重置。
        const previousAids = [...context.branch]
          .reverse()
          .find(
            (message) =>
              message.role === "assistant" &&
              message.metadata?.aids?.configKey === aidsConfig.key,
          )?.metadata?.aids;
        const built = buildChatPrompt(context, {
          userName,
          interactionInstruction: combineAids
            ? buildAidsOutputInstruction(aidsConfig, previousAids)
            : undefined,
        });
        const apiKey = decryptSecret(provider.apiKeyEnc);

        let finishReason: string | null = null;
        let usage:
          | {
              promptTokens?: number;
              completionTokens?: number;
              totalTokens?: number;
            }
          | undefined;

        for await (const event of streamCompletion({
          baseUrl: provider.baseUrl,
          apiKey,
          model: context.session.model ?? provider.model,
          messages: built.messages,
          temperature: built.temperature,
          topP: built.topP,
          maxTokens: built.maxTokens,
          presencePenalty: built.presencePenalty,
          frequencyPenalty: built.frequencyPenalty,
          responseFormat: built.responseFormat,
          signal: controller.signal,
        })) {
          if (event.type === "delta") {
            raw += event.content;
            if (aidsFilter) {
              const visible = aidsFilter.consume(event.content);
              if (visible) {
                partial += visible;
                send("delta", { content: visible });
              }
            } else {
              partial += event.content;
              send("delta", { content: event.content });
            }
          } else {
            finishReason = event.reason;
            usage = event.usage;
          }
        }

        if (aidsFilter) {
          const trailing = aidsFilter.finish();
          if (trailing) {
            partial += trailing;
            send("delta", { content: trailing });
          }
        }

        const content = aidsFilter ? partial.trimEnd() : partial;
        const parsed = parseStructured(
          content,
          context.schema?.schema ?? null,
        );

        let aids: ChatAids | undefined;
        if (aidsFilter && aidsFilter.aidsRaw.trim()) {
          try {
            const generated = parseGeneratedAids(
              aidsFilter.aidsRaw,
              aidsConfig,
              context.session.model ?? provider.model,
            );
            if (isAidsComplete(generated, aidsConfig)) {
              aids = generated;
            }
          } catch {
            // 模型没有按格式返回时，保留空结果，让前端按旧流程补一次。
          }
        }

        const metadata: MessageMetadata = {
          model: context.session.model ?? provider.model,
          providerId: provider.id,
          finishReason: finishReason ?? undefined,
          latencyMs: Date.now() - startedAt,
          worldbookHits: built.hits,
          usage,
          structuredValid: parsed.valid,
          schemaErrors: parsed.errors.length > 0 ? parsed.errors : undefined,
          ...(aids ? { aids } : {}),
        };

        await getDb()
          .update(messages)
          .set({
            content,
            rawContent: raw || partial,
            structured: parsed.structured,
            status: "complete",
            metadata,
            tokensIn: built.estimatedTokens,
            tokensOut:
              usage?.completionTokens ?? estimateTokens(raw || partial),
          })
          .where(eq(messages.id, assistantId));

        if (parentId) {
          await getDb()
            .update(messages)
            .set({ activeChildId: assistantId })
            .where(eq(messages.id, parentId));
        }

        const now = new Date();
        const shouldTitle =
          context.session.title === "新的对话" &&
          context.session.settings?.autoTitle !== false;

        const [firstUser] = shouldTitle
          ? await getDb()
              .select({ content: messages.content })
              .from(messages)
              .where(
                and(
                  eq(messages.sessionId, context.session.id),
                  eq(messages.role, "user"),
                ),
              )
              .orderBy(messages.createdAt)
              .limit(1)
          : [];

        await getDb()
          .update(chatSessions)
          .set({
            activeLeafId: assistantId,
            lastMessageAt: now,
            messageCount: sql`${chatSessions.messageCount} + 1`,
            ...(shouldTitle && firstUser
              ? { title: autoTitle(firstUser.content) }
              : {}),
          })
          .where(eq(chatSessions.id, context.session.id));

        const [messageRow] = await getDb()
          .select()
          .from(messages)
          .where(eq(messages.id, assistantId))
          .limit(1);

        const [sessionRow] = await getDb()
          .select()
          .from(chatSessions)
          .where(eq(chatSessions.id, context.session.id))
          .limit(1);

        if (messageRow && sessionRow) {
          const siblingIds = await loadSiblingIds(
            context.session.id,
            parentId,
          );
          const sessionDto = toChatSessionDTO(sessionRow);
          const done: ChatStreamDone = {
            message: toChatMessageDTO(messageRow, siblingIds),
            session: {
              id: sessionDto.id,
              title: sessionDto.title,
              activeLeafId: sessionDto.activeLeafId,
              messageCount: sessionDto.messageCount,
              lastMessageAt: sessionDto.lastMessageAt,
              updatedAt: sessionDto.updatedAt,
            },
          };
          send("done", done);
        }
      } catch (error) {
        const aborted =
          controller.signal.aborted ||
          requestSignal.aborted ||
          (error instanceof Error && error.name === "AbortError");

        if (aborted) {
          await finalizeError(
            assistantId,
            partial,
            "已停止生成",
            true,
            context.session.id,
            parentId,
          );
        } else {
          const message =
            error instanceof Error ? error.message : "生成失败，请稍后再试";
          await finalizeError(
            assistantId,
            partial,
            message,
            false,
            context.session.id,
            parentId,
          );
          send("error", { message });
        }
      } finally {
        requestSignal.removeEventListener("abort", onAbort);
        close();
      }
    },
    cancel() {
      controller.abort();
      requestSignal.removeEventListener("abort", onAbort);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
