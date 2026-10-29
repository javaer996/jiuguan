import type { Metadata } from "next";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ShieldCheck, UserRound } from "lucide-react";
import { getDb } from "@/db";
import { apiProviders } from "@/db/schema";
import { PageHeader } from "@/components/common/page-header";
import { PasswordForm } from "@/components/settings/password-form";
import { ProviderSettings } from "@/components/settings/provider-settings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { requireUserPage } from "@/lib/auth/page";
import { toProviderDTO } from "@/lib/providers/serializers";
import { initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "设置",
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const context = await requireUserPage("/settings");
  const user = context.user;

  const rows = await getDb()
    .select()
    .from(apiProviders)
    .where(
      and(
        eq(apiProviders.userId, user.id),
        isNull(apiProviders.deletedAt),
      ),
    )
    .orderBy(desc(apiProviders.isDefault), desc(apiProviders.updatedAt));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Settings"
        title="设置"
        description="接入你自己的 AI，管理账号与酒馆偏好。所有密钥都只保存在这台服务器上。"
      />

      <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <ProviderSettings
          initial={rows.map(toProviderDTO)}
          isAdmin={user.role === "admin"}
        />

        <div className="space-y-5">
          <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
            <div className="flex items-center gap-3">
              <Avatar className="size-12 rounded-xl">
                {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                <AvatarFallback className="rounded-xl bg-primary/12 font-display text-primary">
                  {initials(user.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-display text-base font-medium">
                    {user.displayName}
                  </h2>
                  {user.role === "admin" && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-primary/30 px-1.5 py-0 text-[10px] text-primary"
                    >
                      <ShieldCheck className="size-2.5" />
                      管理员
                    </Badge>
                  )}
                </div>
                <p className="truncate text-[11px] text-muted-foreground">
                  @{user.username}
                  {user.email ? ` · ${user.email}` : ""}
                </p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
              <div className="rounded-lg bg-secondary/40 px-2.5 py-2">
                加入于
                <span className="float-right text-foreground">
                  {new Intl.DateTimeFormat("zh-CN", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(user.createdAt)}
                </span>
              </div>
              <div className="rounded-lg bg-secondary/40 px-2.5 py-2">
                供应商
                <span className="float-right text-foreground">
                  {rows.length} 个
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
            <div className="mb-4 flex items-center gap-2">
              <UserRound className="size-4 text-primary" />
              <h2 className="font-display text-base font-medium">账号安全</h2>
            </div>
            <PasswordForm />
          </section>
        </div>
      </div>
    </div>
  );
}
