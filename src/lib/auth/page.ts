import { redirect } from "next/navigation";
import { getCurrentUser, type AuthContext } from "./session";

/** 服务端页面守卫：未登录时跳转登录页，并带上返回地址。 */
export async function requireUserPage(nextPath?: string): Promise<AuthContext> {
  const context = await getCurrentUser();
  if (!context) {
    const target = nextPath
      ? `/login?next=${encodeURIComponent(nextPath)}`
      : "/login";
    redirect(target);
  }
  return context;
}
