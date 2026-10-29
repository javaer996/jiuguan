import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { inviteCodes } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAdmin } from "@/lib/auth/guard";
import { adminInviteUpdateSchema } from "@/lib/validation/admin";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const { id } = await params;
    const input = await readJson(request, adminInviteUpdateSchema);

    const [invite] = await getDb()
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.id, id))
      .limit(1);

    if (!invite) {
      throw new ApiError(404, "INVITE_NOT_FOUND", "邀请码不存在");
    }
    if (input.maxUses !== undefined && input.maxUses < invite.usedCount) {
      throw new ApiError(
        400,
        "INVITE_MAX_USES_TOO_LOW",
        `使用次数不能低于已使用的 ${invite.usedCount} 次`,
      );
    }

    const patch: Partial<typeof inviteCodes.$inferInsert> = {};
    if (input.disabled !== undefined) patch.disabled = input.disabled;
    if (input.maxUses !== undefined) patch.maxUses = input.maxUses;
    if (input.expiresAt !== undefined) {
      patch.expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
    }
    if (input.note !== undefined) patch.note = input.note || null;

    await getDb()
      .update(inviteCodes)
      .set(patch)
      .where(eq(inviteCodes.id, id));

    await recordAudit({
      actorId: context.user.id,
      action: "invite.update",
      targetType: "invite",
      targetId: id,
      detail: { ...patch, code: invite.code },
      request,
    });

    const [updated] = await getDb()
      .select()
      .from(inviteCodes)
      .where(eq(inviteCodes.id, id))
      .limit(1);

    if (!updated) {
      throw new ApiError(404, "INVITE_NOT_FOUND", "邀请码不存在");
    }

    return jsonOk({
      invite: {
        id: updated.id,
        code: updated.code,
        maxUses: updated.maxUses,
        usedCount: updated.usedCount,
        expiresAt: updated.expiresAt?.toISOString() ?? null,
        disabled: updated.disabled,
        note: updated.note,
        createdAt: updated.createdAt.toISOString(),
        createdBy: null,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
