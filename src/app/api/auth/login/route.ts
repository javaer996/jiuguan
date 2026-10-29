import { eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
  toSelfUser,
} from "@/lib/auth/session";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/request";
import { loginSchema } from "@/lib/validation/auth";

const REMEMBER_TTL = 60 * 60 * 24 * 30;
const SHORT_TTL = 60 * 60 * 12;

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const ip = getClientIp(request);
    const ipLimit = rateLimit(`login:ip:${ip}`, 20, 15 * 60 * 1000);
    if (!ipLimit.ok) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `尝试次数过多，请 ${ipLimit.retryAfterSeconds} 秒后再试`,
      );
    }

    const input = await readJson(request, loginSchema);
    const identifier = input.identifier.trim();
    const accountKey = `login:account:${identifier.toLowerCase()}`;
    const accountLimit = rateLimit(accountKey, 8, 15 * 60 * 1000);
    if (!accountLimit.ok) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `该账号尝试次数过多，请 ${accountLimit.retryAfterSeconds} 秒后再试`,
      );
    }

    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(or(eq(users.username, identifier), eq(users.email, identifier)))
      .limit(1);

    if (!user || user.deletedAt) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "用户名或密码错误");
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new ApiError(401, "INVALID_CREDENTIALS", "用户名或密码错误");
    }

    if (user.status !== "active") {
      throw new ApiError(403, "ACCOUNT_DISABLED", "账号已被停用，请联系管理员");
    }

    resetRateLimit(accountKey);

    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    const session = await createSession(
      user,
      { ip, userAgent: getUserAgent(request) },
      input.remember ? REMEMBER_TTL : SHORT_TTL,
    );

    const response = jsonOk({ user: toSelfUser(user) });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
