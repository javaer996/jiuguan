import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { ApiError, handleApiError, jsonOk, readJson } from "@/lib/api";
import { assertSameOrigin } from "@/lib/auth/csrf";
import { requireUser } from "@/lib/auth/guard";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { revokeOtherSessions } from "@/lib/auth/session";
import { changePasswordSchema } from "@/lib/validation/auth";

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const context = await requireUser();
    const input = await readJson(request, changePasswordSchema);

    const valid = await verifyPassword(
      input.currentPassword,
      context.user.passwordHash,
    );
    if (!valid) {
      throw new ApiError(400, "WRONG_PASSWORD", "当前密码不正确");
    }

    const passwordHash = await hashPassword(input.newPassword);
    await getDb()
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, context.user.id));

    await revokeOtherSessions(context.user.id, context.session.id);

    return jsonOk({ updated: true });
  } catch (error) {
    return handleApiError(error);
  }
}
