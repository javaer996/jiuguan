import { modelsUrl } from "@/lib/ai/url";

const TIMEOUT_MS = 15_000;
const MAX_MODELS = 200;

export type ProviderModelsResult =
  | { ok: true; models: string[] }
  | { ok: false; status: number; message: string };

async function readError(response: Response) {
  try {
    const text = await response.text();
    return text.slice(0, 300) || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

/**
 * 读取 OpenAI 兼容服务的 /models 列表。
 * 不跟随重定向，避免被跳转到内网地址。
 */
export async function fetchProviderModels(
  baseUrl: string,
  apiKey: string,
): Promise<ProviderModelsResult> {
  let response: Response;
  try {
    response = await fetch(modelsUrl(baseUrl), {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
      redirect: "error",
    });
  } catch (error) {
    return {
      ok: false,
      status: 0,
      message:
        error instanceof Error && error.name === "TimeoutError"
          ? "连接超时，请检查 API 地址"
          : "无法连接该 API 地址",
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      message: await readError(response),
    };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { ok: false, status: response.status, message: "模型列表不是合法 JSON" };
  }

  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as { data?: unknown; models?: unknown }).data ??
        (payload as { models?: unknown }).models)
      : null;

  if (!Array.isArray(rows)) {
    return {
      ok: false,
      status: response.status,
      message: "该服务返回的模型列表格式无法识别",
    };
  }

  const models = [
    ...new Set(
      rows
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object" && "id" in item) {
            const id = (item as { id?: unknown }).id;
            return typeof id === "string" ? id : null;
          }
          return null;
        })
        .filter((id): id is string => Boolean(id && id.trim())),
    ),
  ]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, MAX_MODELS);

  if (models.length === 0) {
    return {
      ok: false,
      status: response.status,
      message: "连接成功，但该服务没有返回任何模型",
    };
  }

  return { ok: true, models };
}
