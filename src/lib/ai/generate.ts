import { ApiError } from "@/lib/api";
import {
  buildGenerationPrompt,
  DEFAULT_GENERATION_PROMPTS,
  parseAiDraft,
  type AiDraftByKind,
  type AiKind,
} from "@/lib/ai/drafts";
import { parseLooseJson } from "@/lib/ai/parse";
import { getGenerationPromptSettings } from "@/lib/ai/prompt-settings";
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

  const promptSettings = await getGenerationPromptSettings().catch(
    () => DEFAULT_GENERATION_PROMPTS,
  );
  const kindPrompt = promptSettings.kinds[kind];
  const { system, user } = buildGenerationPrompt(kind, idea, {
    sharedRules: promptSettings.sharedRules,
    ...kindPrompt,
  });
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
