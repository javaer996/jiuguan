import { ApiError } from "@/lib/api";
import { getCurrentUser, type AuthContext } from "./session";

export async function requireUser(): Promise<AuthContext> {
  const context = await getCurrentUser();
  if (!context) {
    throw new ApiError(401, "UNAUTHORIZED", "请先登录");
  }
  return context;
}

export async function requireAdmin(): Promise<AuthContext> {
  const context = await requireUser();
  if (context.user.role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", "需要管理员权限");
  }
  return context;
}

/** 资源归属校验：普通用户只能操作自己的数据。 */
export function assertOwner(
  ownerId: string,
  context: AuthContext,
  message = "无权操作该资源",
) {
  if (ownerId !== context.user.id && context.user.role !== "admin") {
    throw new ApiError(403, "FORBIDDEN", message);
  }
}
