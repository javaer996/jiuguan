import type { ProviderCapabilities } from "@/db/schema/types";

export type ProviderDTO = {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyHint: string | null;
  model: string;
  models: string[] | null;
  temperature: number;
  topP: number;
  maxTokens: number;
  presencePenalty: number;
  frequencyPenalty: number;
  contextWindow: number;
  capabilities: ProviderCapabilities | null;
  isDefault: boolean;
  isShared: boolean;
  status: "active" | "disabled";
  lastCheckedAt: string | null;
  lastCheckStatus: string | null;
  lastCheckMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProviderTestResult = {
  ok: boolean;
  message: string;
  latencyMs: number;
  models?: string[];
};
