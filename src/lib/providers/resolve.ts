import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { apiProviderGrants, apiProviders } from "@/db/schema";

type ProviderRow = typeof apiProviders.$inferSelect;

async function findGranted(
  userId: string,
  providerId?: string,
): Promise<ProviderRow | null> {
  const conditions = [
    eq(apiProviderGrants.userId, userId),
    eq(apiProviders.isShared, true),
    eq(apiProviders.status, "active"),
    isNull(apiProviders.deletedAt),
  ];
  if (providerId) {
    conditions.push(eq(apiProviders.id, providerId));
  }

  const [row] = await getDb()
    .select({ provider: apiProviders })
    .from(apiProviderGrants)
    .innerJoin(
      apiProviders,
      eq(apiProviders.id, apiProviderGrants.providerId),
    )
    .where(and(...conditions))
    .orderBy(apiProviders.updatedAt)
    .limit(1);

  return row?.provider ?? null;
}

/**
 * 解析用户可用的供应商：
 * 指定 id 时必须是自己的或已被授权的共享供应商；
 * 未指定时依次回落：自己的默认 → 自己的任一启用项 → 已授权的共享项。
 */
export async function resolveProvider(
  userId: string,
  providerId?: string | null,
): Promise<ProviderRow | null> {
  const db = getDb();

  if (providerId) {
    const [own] = await db
      .select()
      .from(apiProviders)
      .where(
        and(
          eq(apiProviders.id, providerId),
          eq(apiProviders.userId, userId),
          eq(apiProviders.status, "active"),
          isNull(apiProviders.deletedAt),
        ),
      )
      .limit(1);

    return own ?? findGranted(userId, providerId);
  }

  const [ownDefault] = await db
    .select()
    .from(apiProviders)
    .where(
      and(
        eq(apiProviders.userId, userId),
        eq(apiProviders.isDefault, true),
        eq(apiProviders.status, "active"),
        isNull(apiProviders.deletedAt),
      ),
    )
    .limit(1);

  if (ownDefault) return ownDefault;

  const [own] = await db
    .select()
    .from(apiProviders)
    .where(
      and(
        eq(apiProviders.userId, userId),
        eq(apiProviders.status, "active"),
        isNull(apiProviders.deletedAt),
      ),
    )
    .orderBy(apiProviders.updatedAt)
    .limit(1);

  if (own) return own;

  return findGranted(userId);
}
