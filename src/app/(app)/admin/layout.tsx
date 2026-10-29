import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { requireUserPage } from "@/lib/auth/page";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const context = await requireUserPage("/admin");
  if (context.user.role !== "admin") redirect("/chats");

  return (
    <div>
      <div className="border-b border-border/50 bg-background/40">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
          <AdminNav />
        </div>
      </div>
      {children}
    </div>
  );
}
