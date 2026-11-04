import { ApiClientError } from "@/lib/client/api";

export type SseEvent = { event: string; data: string };

/**
 * 发起 POST SSE 请求。非 2xx 或返回 JSON 时解析统一错误结构，
 * 让调用方只需要处理 ApiClientError 与 readSse。
 */
export async function openSse(
  path: string,
  body: unknown,
  signal?: AbortSignal,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
      signal,
      cache: "no-store",
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError(
      "网络连接失败，请检查网络后重试",
      "NETWORK_ERROR",
      0,
    );
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string; details?: unknown };
    } | null;
    throw new ApiClientError(
      payload?.error?.message ?? `请求失败（${response.status}）`,
      payload?.error?.code ?? "REQUEST_FAILED",
      response.status,
      payload?.error?.details,
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new ApiClientError(
      payload?.error?.message ?? "生成失败，请稍后再试",
      "INVALID_RESPONSE",
      response.status,
    );
  }

  return response;
}

/** 解析 fetch 返回的 text/event-stream，逐事件产出。 */
export async function* readSse(
  response: Response,
): AsyncGenerator<SseEvent> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");

      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf("\n\n");

        let event = "message";
        const dataLines: string[] = [];
        for (const line of block.split("\n")) {
          if (line.startsWith("event:")) {
            event = line.slice(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.slice(5).trimStart());
          }
        }
        if (dataLines.length > 0) {
          yield { event, data: dataLines.join("\n") };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
