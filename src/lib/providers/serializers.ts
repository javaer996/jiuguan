import type { apiProviders } from "@/db/schema";
import type { ProviderDTO } from "@/lib/types/provider";

type ProviderRow = typeof apiProviders.$inferSelect;

/** 供应商 DTO 永远不包含密文或明文 API Key，只回显末四位提示。 */
export function toProviderDTO(row: ProviderRow): ProviderDTO {
  return {
    id: row.id,
    name: row.name,
    baseUrl: row.baseUrl,
    apiKeyHint: row.apiKeyHint,
    model: row.model,
    models: row.models ?? null,
    temperature: row.temperature,
    topP: row.topP,
    maxTokens: row.maxTokens,
    presencePenalty: row.presencePenalty,
    frequencyPenalty: row.frequencyPenalty,
    contextWindow: row.contextWindow,
    capabilities: row.capabilities ?? null,
    isDefault: row.isDefault,
    isShared: row.isShared,
    status: row.status,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    lastCheckStatus: row.lastCheckStatus,
    lastCheckMessage: row.lastCheckMessage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
