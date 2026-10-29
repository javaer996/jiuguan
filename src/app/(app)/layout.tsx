import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getCurrentUser, toPublicUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const context = await getCurrentUser();
  if (!context) redirect("/login");

  const user = toPublicUser(context.user);

  return (
    <AppShell
      user={{
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        role: user.role,
      }}
    >
      {children}
    </AppShell>
  );
}
