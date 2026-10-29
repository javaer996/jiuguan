/** 取客户端 IP。生产环境请确保反向代理正确设置 X-Forwarded-For。 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return (request.headers.get("x-real-ip") ?? "unknown").slice(0, 64);
}

export function getUserAgent(request: Request): string {
  return (request.headers.get("user-agent") ?? "").slice(0, 512);
}
