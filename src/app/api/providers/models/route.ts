import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { apiProviders } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { normalizeBaseUrl } from "@/lib/ai/url";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { decryptSecret } from "@/lib/crypto/secretbox";
import { fetchProviderModels } from "@/lib/providers/models";
import { assertSafeProviderUrl } from "@/lib/providers/url-safety";
import { rateLimit } from "@/lib/rate-limit";
import { providerModelsSchema } from "@/lib/validation/provider";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, providerModelsSchema);

    const limit = rateLimit(
      `provider:models:${context.user.id}`,
      20,
      10 * 60 * 1000,
    );
    if (!limit.ok) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `拉取太频繁了，请 ${limit.retryAfterSeconds} 秒后再试`,
      );
    }

    const baseUrl = normalizeBaseUrl(input.baseUrl);
    let apiKey = input.apiKey?.trim() ?? "";

    if (input.providerId) {
      const [row] = await getDb()
        .select()
        .from(apiProviders)
        .where(
          and(
            eq(apiProviders.id, input.providerId),
            eq(apiProviders.userId, context.user.id),
            isNull(apiProviders.deletedAt),
          ),
        )
        .limit(1);

      if (!row) {
        throw new ApiError(
          404,
          "PROVIDER_NOT_FOUND",
          "API 供应商不存在或无权访问",
        );
      }

      if (!apiKey) {
        if (normalizeBaseUrl(row.baseUrl) !== baseUrl) {
          throw new ApiError(
            400,
            "API_KEY_REQUIRED",
            "修改 API 地址后，请重新填写 API Key 再拉取模型",
          );
        }
        apiKey = decryptSecret(row.apiKeyEnc);
      }
    }

    if (!apiKey) {
      throw new ApiError(400, "API_KEY_REQUIRED", "请填写 API Key");
    }

    await assertSafeProviderUrl(baseUrl, { resolveDns: true });

    const result = await fetchProviderModels(baseUrl, apiKey);
    if (!result.ok) {
      if (result.status === 404 || result.status === 405) {
        throw new ApiError(
          400,
          "MODELS_UNSUPPORTED",
          "该服务不提供模型列表，请手动填写模型名",
        );
      }
      throw new ApiError(
        502,
        "MODELS_FETCH_FAILED",
        `拉取模型失败：${result.message}`,
      );
    }

    return jsonOk({ models: result.models });
  } catch (error) {
    return handleApiError(error);
  }
}
