import { eq, or } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { userSettings, users } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { consumeInviteCode } from "@/lib/auth/invite";
import { hashPassword } from "@/lib/auth/password";
import {
  createSession,
  setSessionCookie,
  toSelfUser,
} from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, getUserAgent } from "@/lib/request";
import { getRegistrationPolicy } from "@/lib/settings";
import { registerSchema } from "@/lib/validation/auth";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);

    const ip = getClientIp(request);
    const limit = rateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    if (!limit.ok) {
      throw new ApiError(
        429,
        "RATE_LIMITED",
        `注册过于频繁，请 ${limit.retryAfterSeconds} 秒后再试`,
      );
    }

    const policy = await getRegistrationPolicy();
    if (!policy.enabled) {
      throw new ApiError(403, "REGISTRATION_CLOSED", "当前暂未开放注册");
    }

    const input = await readJson(request, registerSchema);
    const db = getDb();

    const conditions = [eq(users.username, input.username)];
    if (input.email) conditions.push(eq(users.email, input.email));

    const [existing] = await db
      .select({ username: users.username, email: users.email })
      .from(users)
      .where(or(...conditions))
      .limit(1);

    if (existing) {
      if (existing.username === input.username) {
        throw new ApiError(409, "USERNAME_TAKEN", "用户名已被占用");
      }
      throw new ApiError(409, "EMAIL_TAKEN", "邮箱已被注册");
    }

    const passwordHash = await hashPassword(input.password);
    const userId = uuidv7();

    const createdUser = await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        username: input.username,
        displayName: input.displayName,
        passwordHash,
        email: input.email,
      });

      if (policy.inviteRequired) {
        await consumeInviteCode(tx, input.inviteCode, userId, ip);
      }

      await tx.insert(userSettings).values({ userId });

      const [created] = await tx
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!created) {
        throw new ApiError(500, "REGISTER_FAILED", "注册失败，请稍后重试");
      }
      return created;
    });

    const session = await createSession(createdUser, {
      ip,
      userAgent: getUserAgent(request),
    });

    const response = jsonOk({ user: toSelfUser(createdUser) }, { status: 201 });
    setSessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
