import { ApiError } from "@/lib/api";
import { chatCompletionsUrl } from "@/lib/ai/url";
import { assertSafeProviderUrl } from "@/lib/providers/url-safety";
import type { PromptMessage } from "@/lib/ai/prompt";

export type ResponseFormat =
  | { type: "json_object" }
  | {
      type: "json_schema";
      json_schema: {
        name: string;
        strict: boolean;
        schema: Record<string, unknown>;
      };
    };

export type CompletionParams = {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: PromptMessage[];
  temperature: number;
  topP: number;
  maxTokens: number;
  presencePenalty: number;
  frequencyPenalty: number;
  stop?: string[];
  responseFormat?: ResponseFormat | null;
  signal?: AbortSignal;
  /** 调试用：在请求真正发出前拿到实际 JSON body */
  onRequest?: (body: Record<string, unknown>) => void;
};

export type CompletionEvent =
  | { type: "delta"; content: string }
  | {
      type: "finish";
      reason: string | null;
      usage?: {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      };
    };

const REQUEST_TIMEOUT_MS = 180_000;

function textFromDelta(delta: unknown): string {
  if (typeof delta === "string") return delta;
  if (Array.isArray(delta)) {
    return delta
      .map((part) => {
        if (typeof part === "string") return part;
        if (part && typeof part === "object" && "text" in part) {
          const text = (part as { text?: unknown }).text;
          return typeof text === "string" ? text : "";
        }
        return "";
      })
      .join("");
  }
  return "";
}

async function readError(response: Response) {
  const text = await response.text().catch(() => "");
  if (!text) return `供应商返回 HTTP ${response.status}`;
  try {
    const payload = JSON.parse(text) as {
      error?: { message?: unknown } | string;
      message?: unknown;
    };
    const message =
      typeof payload.error === "string"
        ? payload.error
        : typeof payload.error?.message === "string"
          ? payload.error.message
          : typeof payload.message === "string"
            ? payload.message
            : null;
    if (message) return message.slice(0, 500);
  } catch {
    // 非 JSON 错误体，直接截断原文
  }
  return text.slice(0, 500);
}

async function requestCompletion(
  params: CompletionParams,
  includeResponseFormat: boolean,
) {
  await assertSafeProviderUrl(params.baseUrl, { resolveDns: true });

  const body: Record<string, unknown> = {
    model: params.model,
    messages: params.messages,
    temperature: params.temperature,
    top_p: params.topP,
    max_tokens: params.maxTokens,
    presence_penalty: params.presencePenalty,
    frequency_penalty: params.frequencyPenalty,
    stream: true,
  };
  if (params.stop?.length) body.stop = params.stop;
  if (includeResponseFormat && params.responseFormat) {
    body.response_format = params.responseFormat;
  }

  params.onRequest?.(body);

  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = params.signal
    ? AbortSignal.any([params.signal, timeout])
    : timeout;

  const response = await fetch(chatCompletionsUrl(params.baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    },
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
  });

  return response;
}

/** 以异步生成器逐块产出文本，便于上层同时写 SSE 与数据库。 */
export async function* streamCompletion(
  params: CompletionParams,
): AsyncGenerator<CompletionEvent> {
  let response: Response;
  try {
    response = await requestCompletion(params, true);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new ApiError(504, "PROVIDER_TIMEOUT", "AI 服务响应超时");
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw error;
    }
    throw new ApiError(
      502,
      "PROVIDER_UNREACHABLE",
      "无法连接 AI 服务，请检查 API 地址",
    );
  }

  if (
    !response.ok &&
    params.responseFormat &&
    [400, 404, 422].includes(response.status)
  ) {
    // 部分兼容服务不支持 response_format，降级为纯提示词约束后重试一次。
    await response.body?.cancel().catch(() => {});
    try {
      response = await requestCompletion(params, false);
    } catch {
      throw new ApiError(
        502,
        "PROVIDER_UNREACHABLE",
        "无法连接 AI 服务，请检查 API 地址",
      );
    }
  }

  if (!response.ok) {
    throw new ApiError(
      502,
      "PROVIDER_ERROR",
      `AI 服务返回错误：${await readError(response)}`,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";

  // 少数服务忽略 stream 参数，直接返回完整 JSON。
  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as {
      choices?: Array<{
        message?: { content?: unknown };
        finish_reason?: string | null;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };
    const content = textFromDelta(payload.choices?.[0]?.message?.content);
    if (content) yield { type: "delta", content };
    yield {
      type: "finish",
      reason: payload.choices?.[0]?.finish_reason ?? "stop",
      usage: payload.usage
        ? {
            promptTokens: payload.usage.prompt_tokens,
            completionTokens: payload.usage.completion_tokens,
            totalTokens: payload.usage.total_tokens,
          }
        : undefined,
    };
    return;
  }

  if (!response.body) {
    throw new ApiError(502, "PROVIDER_EMPTY", "AI 服务没有返回内容");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finishReason: string | null = null;
  let usage:
    | {
        promptTokens?: number;
        completionTokens?: number;
        totalTokens?: number;
      }
    | undefined;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");

        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        if (data === "[DONE]") {
          yield { type: "finish", reason: finishReason ?? "stop", usage };
          return;
        }

        let payload: {
          choices?: Array<{
            delta?: { content?: unknown; reasoning_content?: unknown };
            finish_reason?: string | null;
          }>;
          usage?: {
            prompt_tokens?: number;
            completion_tokens?: number;
            total_tokens?: number;
          };
        };
        try {
          payload = JSON.parse(data);
        } catch {
          continue;
        }

        const choice = payload.choices?.[0];
        const content = textFromDelta(choice?.delta?.content);
        if (content) yield { type: "delta", content };
        if (choice?.finish_reason) finishReason = choice.finish_reason;
        if (payload.usage) {
          usage = {
            promptTokens: payload.usage.prompt_tokens,
            completionTokens: payload.usage.completion_tokens,
            totalTokens: payload.usage.total_tokens,
          };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  yield { type: "finish", reason: finishReason ?? "stop", usage };
}
