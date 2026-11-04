import {
  ApiError,
  assertPayloadSize,
  handleApiError,
  readJson,
} from "@/lib/api";
import { generateStudioDrafts } from "@/lib/ai/studio";
import { studioGenerateInputSchema } from "@/lib/ai/studio-schema";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { resolveProvider } from "@/lib/providers/resolve";
import { rateLimit } from "@/lib/rate-limit";

const encoder = new TextEncoder();

function sse(event: string, data: unknown) {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    assertPayloadSize(request);
    const input = await readJson(request, studioGenerateInputSchema);

    const limit = rateLimit(
      `ai:studio:generate:${context.user.id}`,
      8,
      10 * 60 * 1000,
    );
    if (!limit.ok) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `生成太频繁了，请 ${limit.retryAfterSeconds} 秒后再试`,
      );
    }

    // 先确认有可用供应商，让前端拿到普通 JSON 错误而不是空 SSE。
    const provider = await resolveProvider(context.user.id, input.providerId);
    if (!provider) {
      throw new ApiError(
        400,
        "NO_PROVIDER",
        "还没有可用的 AI 供应商，请先在设置中接入 OpenAI 兼容 API",
      );
    }

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    request.signal.addEventListener("abort", onAbort, { once: true });

    const stream = new ReadableStream<Uint8Array>({
      async start(streamController) {
        let closed = false;

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

        const heartbeat = setInterval(() => {
          if (closed) return;
          try {
            streamController.enqueue(encoder.encode(": ping\n\n"));
          } catch {
            closed = true;
          }
        }, 15_000);

        try {
          await generateStudioDrafts({
            userId: context.user.id,
            mode: input.mode ?? "batch",
            idea: input.idea,
            brief: input.brief ?? null,
            kinds: input.kinds,
            providerId: input.providerId,
            worldbookEntryCount: input.worldbookEntryCount,
            existing: input.existing,
            overrides: input.overrides,
            signal: controller.signal,
            onProgress: (event) => send(event.type, event),
          });
        } catch (error) {
          if (
            !controller.signal.aborted &&
            !request.signal.aborted
          ) {
            send("error", {
              type: "error",
              message:
                error instanceof Error
                  ? error.message
                  : "生成失败，请稍后再试",
            });
            // 一项出现未捕获异常时，停掉其他仍在进行的 AI 调用。
            controller.abort();
          }
        } finally {
          clearInterval(heartbeat);
          request.signal.removeEventListener("abort", onAbort);
          close();
        }
      },
      cancel() {
        controller.abort();
        request.signal.removeEventListener("abort", onAbort);
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
  } catch (error) {
    return handleApiError(error);
  }
}
