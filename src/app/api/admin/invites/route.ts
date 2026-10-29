import { desc, eq, inArray } from "drizzle-orm";
import { v7 as uuidv7 } from "uuid";
import { getDb } from "@/db";
import { inviteCodes, users } from "@/db/schema";
import { handleApiError, jsonOk, readJson } from "@/lib/api";
import { recordAudit } from "@/lib/audit";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireAdmin } from "@/lib/auth/guard";
import { generateInviteCode } from "@/lib/auth/invite";
import { adminInviteCreateSchema } from "@/lib/validation/admin";

export async function GET() {
  try {
    await requireAdmin();

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

    return jsonOk({
      invites: rows.map(({ invite, creatorId, creatorUsername, creatorDisplayName }) => ({
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
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireAdmin();
    const input = await readJson(request, adminInviteCreateSchema);

    const ids: string[] = [];
    const values = Array.from({ length: input.count }, () => {
      const id = uuidv7();
      ids.push(id);
      return {
        id,
        code: generateInviteCode(),
        createdBy: context.user.id,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        note: input.note || null,
      };
    });

    await getDb().insert(inviteCodes).values(values);

    await recordAudit({
      actorId: context.user.id,
      action: "invite.create",
      targetType: "invite",
      detail: { count: input.count, maxUses: input.maxUses },
      request,
    });

    const rows = await getDb()
      .select()
      .from(inviteCodes)
      .where(inArray(inviteCodes.id, ids))
      .orderBy(desc(inviteCodes.createdAt));

    return jsonOk(
      {
        invites: rows.map((invite) => ({
          id: invite.id,
          code: invite.code,
          maxUses: invite.maxUses,
          usedCount: invite.usedCount,
          expiresAt: invite.expiresAt?.toISOString() ?? null,
          disabled: invite.disabled,
          note: invite.note,
          createdAt: invite.createdAt.toISOString(),
          createdBy: {
            id: context.user.id,
            username: context.user.username,
            displayName: context.user.displayName,
          },
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
