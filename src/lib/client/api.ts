"use client";

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type ApiPayload<T> = {
  ok: boolean;
  data?: T;
  error?: { code?: string; message?: string; details?: unknown };
};

/** 前端统一请求封装：自动解析 { ok, data, error } 结构。 */
export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  const isFormData =
    typeof FormData !== "undefined" && init.body instanceof FormData;
  if (init.body && !isFormData && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers,
      credentials: "same-origin",
    });
  } catch {
    throw new ApiClientError("网络连接失败，请检查网络后重试", "NETWORK_ERROR", 0);
  }

  const payload = (await response.json().catch(() => null)) as ApiPayload<T> | null;

  if (!response.ok || !payload?.ok) {
    throw new ApiClientError(
      payload?.error?.message ?? `请求失败（${response.status}）`,
      payload?.error?.code ?? "REQUEST_FAILED",
      response.status,
      payload?.error?.details,
    );
  }

  return payload.data as T;
}
