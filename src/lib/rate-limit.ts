type Bucket = { count: number; resetAt: number };

const globalForLimiter = globalThis as unknown as {
  jiuguanRateLimit?: Map<string, Bucket>;
};

const store = (globalForLimiter.jiuguanRateLimit ??= new Map());

const MAX_KEYS = 20_000;

function cleanup(now: number) {
  if (store.size < MAX_KEYS) return;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

/**
 * 进程内固定窗口限流。
 * 单实例 Docker 部署足够；多副本时需换成 Redis 或数据库实现。
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  cleanup(now);

  const existing = store.get(key);
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      ok: true,
      remaining: Math.max(0, limit - 1),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  existing.count += 1;
  const remaining = Math.max(0, limit - existing.count);
  return {
    ok: existing.count <= limit,
    remaining,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/** 登录成功后清空该维度的失败计数。 */
export function resetRateLimit(key: string) {
  store.delete(key);
}
