import { sql } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { templateDailyStats, templateEvents } from "@/db/schema";

type EventType = "view" | "clone" | "like" | "unlike" | "favorite" | "share";

export type EventMeta = {
  ip?: string | null;
  userAgent?: string | null;
};

export function eventMetaFromRequest(request: Request): EventMeta {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const userAgent = request.headers.get("user-agent");
  return {
    ip: ip ? ip.slice(0, 64) : null,
    userAgent: userAgent ? userAgent.slice(0, 512) : null,
  };
}

export async function recordTemplateEvent(
  templateId: string,
  userId: string | null,
  type: EventType,
  meta: EventMeta = {},
) {
  await getDb()
    .insert(templateEvents)
    .values({
      id: uuidv7(),
      templateId,
      userId,
      type,
      ip: meta.ip ?? null,
      userAgent: meta.userAgent ?? null,
    });
}

/** 按天累计统计，冲突时自增对应列。 */
export async function bumpDailyStat(
  templateId: string,
  field: "views" | "clones" | "likes",
) {
  const db = getDb();
  const day = new Date();
  day.setHours(0, 0, 0, 0);

  if (field === "views") {
    await db
      .insert(templateDailyStats)
      .values({ id: uuidv7(), templateId, day, views: 1 })
      .onDuplicateKeyUpdate({
        set: { views: sql`${templateDailyStats.views} + 1` },
      });
    return;
  }

  if (field === "clones") {
    await db
      .insert(templateDailyStats)
      .values({ id: uuidv7(), templateId, day, clones: 1 })
      .onDuplicateKeyUpdate({
        set: { clones: sql`${templateDailyStats.clones} + 1` },
      });
    return;
  }

  await db
    .insert(templateDailyStats)
    .values({ id: uuidv7(), templateId, day, likes: 1 })
    .onDuplicateKeyUpdate({
      set: { likes: sql`${templateDailyStats.likes} + 1` },
    });
}
