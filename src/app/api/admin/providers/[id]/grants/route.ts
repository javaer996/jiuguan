import { and, eq, isNull } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { apiProviderGrants, apiProviders, users } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAdmin } from "@/lib/auth/guard";
import { adminGrantSchema } from "@/lib/validation/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const { id } = await params;
    const input = await readJson(request, adminGrantSchema);

    const [provider] = await getDb()
      .select()
      .from(apiProviders)
      .where(
        and(
          eq(apiProviders.id, id),
          eq(apiProviders.isShared, true),
          isNull(apiProviders.deletedAt),
        ),
      )
      .limit(1);

    if (!provider) {
      throw new ApiError(404, "PROVIDER_NOT_FOUND", "共享供应商不存在");
    }

    const [target] = await getDb()
      .select({ id: users.id, status: users.status })
      .from(users)
      .where(and(eq(users.id, input.userId), isNull(users.deletedAt)))
      .limit(1);

    if (!target || target.status !== "active") {
      throw new ApiError(404, "USER_NOT_FOUND", "用户不存在或不可用");
    }

    if (input.action === "grant") {
      await getDb()
        .insert(apiProviderGrants)
        .values({
          id: uuidv7(),
          providerId: provider.id,
          userId: target.id,
          grantedBy: context.user.id,
        })
        .onDuplicateKeyUpdate({
          set: { grantedBy: context.user.id, updatedAt: new Date() },
        });
    } else {
      await getDb()
        .delete(apiProviderGrants)
        .where(
          and(
            eq(apiProviderGrants.providerId, provider.id),
            eq(apiProviderGrants.userId, target.id),
          ),
        );
    }

    await recordAudit({
      actorId: context.user.id,
      action:
        input.action === "grant" ? "provider.grant" : "provider.revoke",
      targetType: "provider",
      targetId: provider.id,
      detail: { userId: target.id, providerName: provider.name },
      request,
    });

    return jsonOk({ granted: input.action === "grant" });
  } catch (error) {
    return handleApiError(error);
  }
}
