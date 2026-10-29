import { jsonrepair } from "jsonrepair";
import { ApiError } from "@/lib/api";
import {
  buildGenerationPrompt,
  parseAiDraft,
  type AiDraftByKind,
  type AiKind,
} from "@/lib/ai/drafts";
import { streamCompletion } from "@/lib/ai/openai";
import { decryptSecret } from "@/lib/crypto/secretbox";
import { resolveProvider } from "@/lib/providers/resolve";

type GenerateArgs = {
  userId: string;
  kind: AiKind;
  idea: string;
  providerId?: string | null;
  signal?: AbortSignal;
};

function stripCodeFence(raw: string) {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

function parseLooseJson(raw: string) {
  const text = stripCodeFence(raw);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    try {
      return JSON.parse(jsonrepair(text)) as unknown;
    } catch {
      throw new ApiError(
        502,
        "AI_INVALID_JSON",
        "AI 没有返回合法 JSON，请重试或换一个模型",
      );
    }
  }
}

export async function generateAiDraft<K extends AiKind>({
  userId,
  kind,
  idea,
  providerId,
  signal,
}: GenerateArgs & { kind: K }): Promise<{
  draft: AiDraftByKind[K];
  model: string;
}> {
  const provider = await resolveProvider(userId, providerId);
  if (!provider) {
    throw new ApiError(
      400,
      "NO_PROVIDER",
      "还没有可用的 AI 供应商，请先在设置中接入 OpenAI 兼容 API",
    );
  }

  const { system, user } = buildGenerationPrompt(kind, idea);
  const apiKey = decryptSecret(provider.apiKeyEnc);
  let raw = "";

  for await (const event of streamCompletion({
    baseUrl: provider.baseUrl,
    apiKey,
    model: provider.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.85,
    topP: 1,
    maxTokens: 3000,
    presencePenalty: 0,
    frequencyPenalty: 0,
    responseFormat: { type: "json_object" },
    signal,
  })) {
    if (event.type === "delta") raw += event.content;
  }

  if (!raw.trim()) {
    throw new ApiError(502, "AI_EMPTY", "AI 没有返回内容，请重试");
  }

  const parsed = parseLooseJson(raw);
  try {
    return {
      draft: parseAiDraft(kind, parsed),
      model: provider.model,
    };
  } catch (error) {
    throw new ApiError(
      502,
      "AI_INVALID_DRAFT",
      error instanceof Error
        ? `AI 返回的内容不完整：${error.message}`
        : "AI 返回的内容不符合要求，请重试",
    );
  }
}
