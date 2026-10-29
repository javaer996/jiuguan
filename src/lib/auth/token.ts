import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";
import {
  SESSION_AUDIENCE,
  SESSION_ISSUER,
} from "./constants";

export type SessionRole = "user" | "admin";

export type SessionTokenPayload = {
  sub: string;
  sid: string;
  role: SessionRole;
  username: string;
};

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().AUTH_SECRET);
}

export async function signSessionToken(
  payload: SessionTokenPayload,
  expiresAt: Date,
): Promise<string> {
  return new SignJWT({
    sid: payload.sid,
    role: payload.role,
    username: payload.username,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.sub)
    .setIssuer(SESSION_ISSUER)
    .setAudience(SESSION_AUDIENCE)
    .setIssuedAt()
    .setJti(payload.sid)
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: SESSION_ISSUER,
      audience: SESSION_AUDIENCE,
      algorithms: ["HS256"],
    });

    const role = payload.role;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.sid !== "string" ||
      typeof payload.username !== "string" ||
      (role !== "user" && role !== "admin")
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      sid: payload.sid,
      role,
      username: payload.username,
    };
  } catch {
    return null;
  }
}
