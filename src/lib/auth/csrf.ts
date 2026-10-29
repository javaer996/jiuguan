import { ApiError } from "@/lib/api";
import { getEnv } from "@/lib/env";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * 校验写请求的 Origin。
 * Cookie 使用 SameSite=Lax，正常情况下跨站 POST 不会携带 Cookie，
 * 这里再加一层 Origin 校验，防御同站子域或代理配置错误的情况。
 */
export function assertSameOrigin(request: Request) {
  if (!MUTATING_METHODS.has(request.method)) return;

  const origin = request.headers.get("origin");
  const secFetchSite = request.headers.get("sec-fetch-site");

  if (origin) {
    const allowed = new Set<string>();
    try {
      allowed.add(new URL(getEnv().APP_URL).origin);
    } catch {
      // APP_URL 非法时由 env 校验兜底
    }

    const host = request.headers.get("host");
    if (host) {
      const forwardedProto = request.headers.get("x-forwarded-proto");
      const proto =
        forwardedProto === "https" || origin.startsWith("https:")
          ? "https"
          : "http";
      allowed.add(`${proto}://${host}`);
    }

    if (!allowed.has(origin)) {
      throw new ApiError(403, "CSRF_REJECTED", "请求来源不被允许");
    }
    return;
  }

  // 没有 Origin 时，只接受浏览器明确标记为同源/用户直接发起的请求。
  // 两者都缺失的写请求一律拒绝，避免非浏览器客户端绕过 CSRF 校验。
  if (secFetchSite === "same-origin" || secFetchSite === "none") {
    return;
  }

  throw new ApiError(403, "CSRF_REJECTED", "请求来源不被允许");
}
