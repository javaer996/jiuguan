import {
  and,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  like,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "@/db";
import {
  apiProviderGrants,
  apiProviders,
  auditLogs,
  inviteCodes,
  users,
} from "@/db/schema";
import type {
  AdminAuditDTO,
  AdminInviteDTO,
  AdminSharedProviderDTO,
  AdminUserDTO,
} from "@/lib/types/admin";

export type AdminUserFilters = {
  q?: string;
  status?: "active" | "suspended" | "deleted";
  role?: "user" | "admin";
  limit?: number;
  offset?: number;
};

export async function listAdminUsers({
  q,
  status,
  role,
  limit = 50,
  offset = 0,
}: AdminUserFilters): Promise<{ items: AdminUserDTO[]; total: number }> {
  const db = getDb();
  const conditions = [];

  if (status === "deleted") {
    conditions.push(isNotNull(users.deletedAt));
  } else {
    conditions.push(isNull(users.deletedAt));
    if (status) conditions.push(eq(users.status, status));
  }
  if (role) conditions.push(eq(users.role, role));
  if (q) {
    const pattern = `%${q}%`;
    conditions.push(
      or(
        like(users.username, pattern),
        like(users.displayName, pattern),
        like(users.email, pattern),
      ),
    );
  }

  const where = and(...conditions);

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: sql<number>`count(*)`.mapWith(Number) })
      .from(users)
      .where(where),
  ]);

  return {
    total: totalRow[0]?.total ?? 0,
    items: rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.displayName,
      email: row.email,
      avatarUrl: row.avatarUrl,
      role: row.role,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
      deletedAt: row.deletedAt?.toISOString() ?? null,
    })),
  };
}

export async function countActiveAdmins(): Promise<number> {
  const [row] = await getDb()
    .select({ total: sql<number>`count(*)`.mapWith(Number) })
    .from(users)
    .where(
      and(
        eq(users.role, "admin"),
        eq(users.status, "active"),
        isNull(users.deletedAt),
      ),
    );
  return row?.total ?? 0;
}

export async function listAdminInvites(): Promise<AdminInviteDTO[]> {
  const rows = await getDb()
    .select({
      invite: inviteCodes,
      creatorId: users.id,
      creatorUsername: users.username,
      creatorDisplayName: users.displayName,
    })
    .from(inviteCodes)
    .leftJoin(users, eq(users.id, inviteCodes.createdBy))
    .orderBy(desc(inviteCodes.createdAt))
    .limit(200);

  return rows.map(({ invite, creatorId, creatorUsername, creatorDisplayName }) => ({
    id: invite.id,
    code: invite.code,
    maxUses: invite.maxUses,
    usedCount: invite.usedCount,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
    disabled: invite.disabled,
    note: invite.note,
    createdAt: invite.createdAt.toISOString(),
    createdBy:
      creatorId && creatorUsername && creatorDisplayName
        ? {
            id: creatorId,
            username: creatorUsername,
            displayName: creatorDisplayName,
          }
        : null,
  }));
}

export async function listAdminSharedProviders(): Promise<
  AdminSharedProviderDTO[]
> {
  const db = getDb();
  const rows = await db
    .select({
      provider: apiProviders,
      ownerId: users.id,
      ownerUsername: users.username,
      ownerDisplayName: users.displayName,
    })
    .from(apiProviders)
    .leftJoin(users, eq(users.id, apiProviders.userId))
    .where(
      and(eq(apiProviders.isShared, true), isNull(apiProviders.deletedAt)),
    )
    .orderBy(desc(apiProviders.updatedAt));

  const ids = rows.map((row) => row.provider.id);
  const grantRows =
    ids.length > 0
      ? await db
          .select({
            providerId: apiProviderGrants.providerId,
            userId: apiProviderGrants.userId,
            grantedAt: apiProviderGrants.createdAt,
            username: users.username,
            displayName: users.displayName,
          })
          .from(apiProviderGrants)
          .innerJoin(users, eq(users.id, apiProviderGrants.userId))
          .where(inArray(apiProviderGrants.providerId, ids))
          .orderBy(desc(apiProviderGrants.createdAt))
      : [];

  const grantsByProvider = new Map<
    string,
    AdminSharedProviderDTO["grants"]
  >();
  for (const grant of grantRows) {
    const list = grantsByProvider.get(grant.providerId) ?? [];
    list.push({
      userId: grant.userId,
      username: grant.username,
      displayName: grant.displayName,
      grantedAt: grant.grantedAt.toISOString(),
    });
    grantsByProvider.set(grant.providerId, list);
  }

  return rows.map(({ provider, ownerId, ownerUsername, ownerDisplayName }) => ({
    id: provider.id,
    name: provider.name,
    baseUrl: provider.baseUrl,
    model: provider.model,
    status: provider.status,
    apiKeyHint: provider.apiKeyHint,
    owner:
      ownerId && ownerUsername && ownerDisplayName
        ? {
            id: ownerId,
            username: ownerUsername,
            displayName: ownerDisplayName,
          }
        : null,
    grants: grantsByProvider.get(provider.id) ?? [],
  }));
}

export async function listAdminAudit(limit = 100): Promise<AdminAuditDTO[]> {
  const rows = await getDb()
    .select({
      log: auditLogs,
      actorId: users.id,
      actorUsername: users.username,
      actorDisplayName: users.displayName,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .orderBy(desc(auditLogs.createdAt))
    .limit(Math.min(limit, 300));

  return rows.map(({ log, actorId, actorUsername, actorDisplayName }) => ({
    id: log.id,
    action: log.action,
    targetType: log.targetType,
    targetId: log.targetId,
    detail: log.detail ?? null,
    ip: log.ip,
    createdAt: log.createdAt.toISOString(),
    actor:
      actorId && actorUsername && actorDisplayName
        ? {
            id: actorId,
            username: actorUsername,
            displayName: actorDisplayName,
          }
        : null,
  }));
}
