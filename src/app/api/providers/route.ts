import { and, desc, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { apiProviders } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { normalizeBaseUrl } from "@/lib/ai/url";
import { assertSafeProviderUrl } from "@/lib/providers/url-safety";
import { encryptSecret, maskSecret } from "@/lib/crypto/secretbox";
import { toProviderDTO } from "@/lib/providers/serializers";
import { providerCreateSchema } from "@/lib/validation/provider";

export async function GET() {
  try {
    const context = await requireUser();

    const rows = await getDb()
      .select()
      .from(apiProviders)
      .where(
        and(
          eq(apiProviders.userId, context.user.id),
          isNull(apiProviders.deletedAt),
        ),
      )
      .orderBy(desc(apiProviders.isDefault), desc(apiProviders.updatedAt));

    return jsonOk({ providers: rows.map(toProviderDTO) });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, providerCreateSchema);

    if (input.isShared && context.user.role !== "admin") {
      throw new ApiError(403, "FORBIDDEN", "只有管理员可以创建共享供应商");
    }

    const baseUrl = normalizeBaseUrl(input.baseUrl);
    await assertSafeProviderUrl(baseUrl);

    const id = uuidv7();
    const isDefault = input.isDefault ?? false;

    await getDb().transaction(async (tx) => {
      if (isDefault) {
        await tx
          .update(apiProviders)
          .set({ isDefault: false })
          .where(eq(apiProviders.userId, context.user.id));
      }

      await tx.insert(apiProviders).values({
        id,
        userId: context.user.id,
        name: input.name,
        baseUrl,
        apiKeyEnc: encryptSecret(input.apiKey),
        apiKeyHint: maskSecret(input.apiKey),
        model: input.model,
        models: input.models ?? null,
        temperature: input.temperature ?? 0.85,
        topP: input.topP ?? 1,
        maxTokens: input.maxTokens ?? 2048,
        presencePenalty: input.presencePenalty ?? 0,
        frequencyPenalty: input.frequencyPenalty ?? 0,
        contextWindow: input.contextWindow ?? 8192,
        capabilities: input.capabilities ?? null,
        isDefault,
        isShared: input.isShared ?? false,
        status: input.status ?? "active",
      });
    });

    const [row] = await getDb()
      .select()
      .from(apiProviders)
      .where(eq(apiProviders.id, id))
      .limit(1);

    if (!row) throw new Error("供应商创建失败");

    return jsonOk({ provider: toProviderDTO(row) }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
