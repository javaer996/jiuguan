import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { authSessions, users } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { countActiveAdmins } from "@/lib/admin/query";
import { recordAudit } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAdmin } from "@/lib/auth/guard";
import { adminUserUpdateSchema } from "@/lib/validation/admin";

type RouteContext = { params: Promise<{ id: string }> };

async function findTarget(id: string) {
  const [target] = await getDb()
    .select()
    .from(users)
    .where(and(eq(users.id, id), isNull(users.deletedAt)))
    .limit(1);
  if (!target) {
    throw new ApiError(404, "USER_NOT_FOUND", "用户不存在或已被删除");
  }
  return target;
}

async function revokeSessions(userId: string) {
  await getDb()
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)),
    );
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const { id } = await params;
    const input = await readJson(request, adminUserUpdateSchema);
    const target = await findTarget(id);

    if (target.id === context.user.id) {
      throw new ApiError(400, "SELF_ACTION", "不能修改自己的角色或状态");
    }

    const losingAdmin =
      target.role === "admin" &&
      (input.role === "user" || input.status === "suspended");
    if (losingAdmin && (await countActiveAdmins()) <= 1) {
      throw new ApiError(400, "LAST_ADMIN", "至少要保留一位可用的管理员");
    }

    const patch: Partial<typeof users.$inferInsert> = {};
    if (input.role) patch.role = input.role;
    if (input.status) patch.status = input.status;

    await getDb().update(users).set(patch).where(eq(users.id, target.id));

    if (input.status === "suspended") {
      await revokeSessions(target.id);
    }

    await recordAudit({
      actorId: context.user.id,
      action: "user.update",
      targetType: "user",
      targetId: target.id,
      detail: { ...patch },
      request,
    });

    const [updated] = await getDb()
      .select()
      .from(users)
      .where(eq(users.id, target.id))
      .limit(1);

    if (!updated) {
      throw new ApiError(404, "USER_NOT_FOUND", "用户不存在或已被删除");
    }

    return jsonOk({
      user: {
        id: updated.id,
        username: updated.username,
        displayName: updated.displayName,
        email: updated.email,
        avatarUrl: updated.avatarUrl,
        role: updated.role,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
        lastLoginAt: updated.lastLoginAt?.toISOString() ?? null,
        deletedAt: updated.deletedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const { id } = await params;
    const target = await findTarget(id);

    if (target.id === context.user.id) {
      throw new ApiError(400, "SELF_ACTION", "不能删除自己的账号");
    }
    if (target.role === "admin" && (await countActiveAdmins()) <= 1) {
      throw new ApiError(400, "LAST_ADMIN", "至少要保留一位可用的管理员");
    }

    await getDb()
      .update(users)
      .set({ status: "deleted", deletedAt: new Date() })
      .where(eq(users.id, target.id));
    await revokeSessions(target.id);

    await recordAudit({
      actorId: context.user.id,
      action: "user.delete",
      targetType: "user",
      targetId: target.id,
      detail: { username: target.username },
      request,
    });

    return jsonOk({ deleted: true });
  } catch (error) {
    return handleApiError(error);
  }
}
