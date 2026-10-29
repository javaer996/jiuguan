import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiSuccess<T> = { ok: true; data: T };
export type ApiFailure = {
  ok: false;
  error: { code: string; message: string; details?: unknown };
};

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json<ApiSuccess<T>>({ ok: true, data }, init);
}

export function jsonError(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json<ApiFailure>(
    { ok: false, error: { code, message, details } },
    { status },
  );
}

function zodDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/** 统一把异常转换成前端可消费的 JSON，避免把内部错误泄露给客户端。 */
export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return jsonError(error.status, error.code, error.message, error.details);
  }

  if (error instanceof ZodError) {
    return jsonError(400, "VALIDATION_ERROR", "参数校验失败", zodDetails(error));
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_DUP_ENTRY"
  ) {
    return jsonError(409, "DUPLICATE", "该记录已存在");
  }

  console.error("[api] 未处理异常", error);
  return jsonError(500, "INTERNAL_ERROR", "服务器开小差了，请稍后再试");
}

/** 解析并校验 JSON 请求体。 */
export async function readJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "请求体不是合法的 JSON");
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(400, "VALIDATION_ERROR", "参数校验失败", zodDetails(parsed.error));
  }
  return parsed.data;
}
