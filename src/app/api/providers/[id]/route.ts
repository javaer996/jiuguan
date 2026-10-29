import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { apiProviders } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { normalizeBaseUrl } from "@/lib/ai/url";
import { assertSafeProviderUrl } from "@/lib/providers/url-safety";
import { encryptSecret, maskSecret } from "@/lib/crypto/secretbox";
import { toProviderDTO } from "@/lib/providers/serializers";
import { providerInputSchema } from "@/lib/validation/provider";

type RouteParams = { params: Promise<{ id: string }> };

async function findOwned(id: string, userId: string) {
  const [row] = await getDb()
    .select()
    .from(apiProviders)
    .where(
      and(
        eq(apiProviders.id, id),
        eq(apiProviders.userId, userId),
        isNull(apiProviders.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ApiError(404, "PROVIDER_NOT_FOUND", "API 供应商不存在或无权访问");
  }
  return row;
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const context = await requireUser();
    const { id } = await params;
    const row = await findOwned(id, context.user.id);
    return jsonOk({ provider: toProviderDTO(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    const existing = await findOwned(id, context.user.id);

    const input = await readJson(request, providerInputSchema);

    if (input.isShared && context.user.role !== "admin") {
      throw new ApiError(403, "FORBIDDEN", "只有管理员可以创建共享供应商");
    }

    const baseUrl = normalizeBaseUrl(input.baseUrl);
    await assertSafeProviderUrl(baseUrl);

    const isDefault = input.isDefault ?? existing.isDefault;
    const nextKey = input.apiKey?.trim();

    await getDb().transaction(async (tx) => {
      if (isDefault && !existing.isDefault) {
        await tx
          .update(apiProviders)
          .set({ isDefault: false })
          .where(eq(apiProviders.userId, context.user.id));
      }

      await tx
        .update(apiProviders)
        .set({
          name: input.name,
          baseUrl,
          ...(nextKey
            ? {
                apiKeyEnc: encryptSecret(nextKey),
                apiKeyHint: maskSecret(nextKey),
              }
            : {}),
          model: input.model,
          models: input.models ?? null,
          temperature: input.temperature ?? existing.temperature,
          topP: input.topP ?? existing.topP,
          maxTokens: input.maxTokens ?? existing.maxTokens,
          presencePenalty:
            input.presencePenalty ?? existing.presencePenalty,
          frequencyPenalty:
            input.frequencyPenalty ?? existing.frequencyPenalty,
          contextWindow: input.contextWindow ?? existing.contextWindow,
          capabilities: input.capabilities ?? null,
          isDefault,
          isShared: input.isShared ?? existing.isShared,
          status: input.status ?? existing.status,
        })
        .where(
          and(
            eq(apiProviders.id, id),
            eq(apiProviders.userId, context.user.id),
          ),
        );
    });

    const row = await findOwned(id, context.user.id);
    return jsonOk({ provider: toProviderDTO(row) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const { id } = await params;
    await findOwned(id, context.user.id);

    await getDb()
      .update(apiProviders)
      .set({ deletedAt: new Date(), isDefault: false, status: "disabled" })
      .where(
        and(
          eq(apiProviders.id, id),
          eq(apiProviders.userId, context.user.id),
        ),
      );

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
