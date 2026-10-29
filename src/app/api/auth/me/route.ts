import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { userSettings } from "@/db/schema";
import { handleApiError, jsonOk } from "@/lib/api";
import { requireUser } from "@/lib/auth/guard";
import { toSelfUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const context = await requireUser();
    const [settings] = await getDb()
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, context.user.id))
      .limit(1);

    return jsonOk({
      user: toSelfUser(context.user),
      settings: settings ?? null,
      session: {
        id: context.session.id,
        expiresAt: context.session.expiresAt,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
