import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { apiProviders } from "@/db/schema";
import { ApiError, handleApiError, jsonOk } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { chatCompletionsUrl } from "@/lib/ai/url";
import { decryptSecret } from "@/lib/crypto/secretbox";
import { fetchProviderModels } from "@/lib/providers/models";
import { assertSafeProviderUrl } from "@/lib/providers/url-safety";
import type { ProviderTestResult } from "@/lib/types/provider";

type RouteParams = { params: Promise<{ id: string }> };

const TIMEOUT_MS = 15_000;

async function readError(response: Response) {
  try {
    const text = await response.text();
    return text.slice(0, 300) || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function tryChat(model: string, baseUrl: string, apiKey: string) {
  const response = await fetch(chatCompletionsUrl(baseUrl), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
      stream: false,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
    redirect: "error",
  });

  if (!response.ok) {
    return { ok: false as const, message: await readError(response) };
  }
  return { ok: true as const };
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;

    const [row] = await getDb()
      .select()
      .from(apiProviders)
      .where(
        and(
          eq(apiProviders.id, id),
          eq(apiProviders.userId, context.user.id),
          isNull(apiProviders.deletedAt),
        ),
      )
      .limit(1);

    if (!row) {
      throw new ApiError(404, "PROVIDER_NOT_FOUND", "API 供应商不存在或无权访问");
    }

    await assertSafeProviderUrl(row.baseUrl, { resolveDns: true });

    const apiKey = decryptSecret(row.apiKeyEnc);
    const startedAt = Date.now();
    let result: ProviderTestResult;

    try {
      const models = await fetchProviderModels(row.baseUrl, apiKey);
      if (models.ok) {
        result = {
          ok: true,
          message: `连接成功，发现 ${models.models.length} 个模型`,
          latencyMs: Date.now() - startedAt,
          models: models.models.slice(0, 100),
        };
      } else if (models.status === 404 || models.status === 405) {
        const chat = await tryChat(row.model, row.baseUrl, apiKey);
        result = chat.ok
          ? {
              ok: true,
              message: "连接成功（该服务不提供模型列表）",
              latencyMs: Date.now() - startedAt,
            }
          : {
              ok: false,
              message: chat.message,
              latencyMs: Date.now() - startedAt,
            };
      } else {
        result = {
          ok: false,
          message: models.message,
          latencyMs: Date.now() - startedAt,
        };
      }
    } catch (error) {
      result = {
        ok: false,
        message:
          error instanceof Error && error.name === "TimeoutError"
            ? "连接超时，请检查 API 地址"
            : error instanceof Error
              ? error.message.slice(0, 300)
              : "连接失败",
        latencyMs: Date.now() - startedAt,
      };
    }

    await getDb()
      .update(apiProviders)
      .set({
        lastCheckedAt: new Date(),
        lastCheckStatus: result.ok ? "ok" : "error",
        lastCheckMessage: result.message.slice(0, 512),
      })
      .where(eq(apiProviders.id, row.id));

    return jsonOk({ result });
  } catch (error) {
    return handleApiError(error);
  }
}
