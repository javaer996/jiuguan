import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { Database } from "@/db";
import { inviteCodeUses, inviteCodes } from "@/db/schema";
import { ApiError } from "@/lib/api";

type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0];

// 去掉 0/O/1/I 等易混淆字符
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 10): string {
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return result;
}

export function normalizeInviteCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * 在事务中锁定并消费邀请码。
 * 使用 SELECT ... FOR UPDATE 防止并发注册超发。
 */
export async function consumeInviteCode(
  tx: Transaction,
  rawCode: string,
  userId: string,
  ip?: string,
): Promise<void> {
  const code = normalizeInviteCode(rawCode);

  const [invite] = await tx
    .select()
    .from(inviteCodes)
    .where(eq(inviteCodes.code, code))
    .limit(1)
    .for("update");

  if (!invite) {
    throw new ApiError(400, "INVITE_INVALID", "邀请码无效");
  }
  if (invite.disabled) {
    throw new ApiError(400, "INVITE_DISABLED", "邀请码已被停用");
  }
  if (invite.expiresAt && invite.expiresAt.getTime() <= Date.now()) {
    throw new ApiError(400, "INVITE_EXPIRED", "邀请码已过期");
  }
  if (invite.usedCount >= invite.maxUses) {
    throw new ApiError(400, "INVITE_EXHAUSTED", "邀请码使用次数已用完");
  }

  await tx
    .update(inviteCodes)
    .set({ usedCount: sql`${inviteCodes.usedCount} + 1` })
    .where(eq(inviteCodes.id, invite.id));

  await tx.insert(inviteCodeUses).values({
    inviteCodeId: invite.id,
    userId,
    ip,
  });
}
