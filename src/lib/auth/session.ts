import { createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { authSessions, users } from "@/db/schema";
import { secureCookiesEnabled } from "@/lib/env";
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from "./constants";
import { signSessionToken, verifySessionToken } from "./token";

export type DbUser = typeof users.$inferSelect;
export type DbSession = typeof authSessions.$inferSelect;
export type AuthContext = { user: DbUser; session: DbSession };

export type SessionMeta = { ip?: string; userAgent?: string };

export type PublicUser = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  role: "user" | "admin";
  createdAt: Date;
};

export type SelfUser = PublicUser & { email: string | null };

export function toPublicUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    role: user.role,
    createdAt: user.createdAt,
  };
}

export function toSelfUser(user: DbUser): SelfUser {
  return { ...toPublicUser(user), email: user.email };
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function safeEqualHash(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "hex");
    const right = Buffer.from(b, "hex");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

export async function createSession(
  user: Pick<DbUser, "id" | "username" | "role">,
  meta: SessionMeta = {},
  ttlSeconds = SESSION_TTL_SECONDS,
): Promise<{ token: string; expiresAt: Date; sessionId: string }> {
  const sessionId = uuidv7();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const token = await signSessionToken(
    {
      sub: user.id,
      sid: sessionId,
      role: user.role,
      username: user.username,
    },
    expiresAt,
  );

  await getDb().insert(authSessions).values({
    id: sessionId,
    userId: user.id,
    tokenHash: hashToken(token),
    expiresAt,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });

  return { token, expiresAt, sessionId };
}

export async function readSessionToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value ?? null;
}

/** 读取当前登录用户，同时校验 JWT 与数据库会话（可撤销）。 */
export async function getCurrentUser(): Promise<AuthContext | null> {
  const token = await readSessionToken();
  if (!token) return null;

  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const db = getDb();
  const [row] = await db
    .select({ session: authSessions, user: users })
    .from(authSessions)
    .innerJoin(users, eq(authSessions.userId, users.id))
    .where(
      and(
        eq(authSessions.id, payload.sid),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!row) return null;
  if (!safeEqualHash(row.session.tokenHash, hashToken(token))) return null;
  if (row.user.status !== "active" || row.user.deletedAt) return null;

  // 每 5 分钟更新一次活跃时间，避免每个请求都写库
  if (Date.now() - row.session.lastUsedAt.getTime() > 5 * 60 * 1000) {
    await db
      .update(authSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(authSessions.id, row.session.id));
  }

  return { user: row.user, session: row.session };
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookiesEnabled(),
    path: "/",
    expires: expiresAt,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: secureCookiesEnabled(),
    path: "/",
    maxAge: 0,
  });
}

/** 注销当前令牌对应的会话。 */
export async function revokeSessionByToken(token: string): Promise<void> {
  const payload = await verifySessionToken(token);
  if (!payload) return;

  await getDb()
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(authSessions.id, payload.sid),
        isNull(authSessions.revokedAt),
      ),
    );
}

/** 修改密码后注销其他设备，保留当前会话。 */
export async function revokeOtherSessions(
  userId: string,
  keepSessionId: string,
): Promise<void> {
  const db = getDb();
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(authSessions.userId, userId),
        isNull(authSessions.revokedAt),
        ne(authSessions.id, keepSessionId),
      ),
    );
}
