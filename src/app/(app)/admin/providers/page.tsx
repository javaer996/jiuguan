import type { Metadata } from "next";
import Link from "next/link";
import { Cpu, KeyRound, Settings2 } from "lucide-react";
import { ProviderGrantsDialog } from "@/components/admin/provider-grants-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listAdminSharedProviders, listAdminUsers } from "@/lib/admin/query";
import { requireUserPage } from "@/lib/auth/page";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "共享 API",
};

export const dynamic = "force-dynamic";

export default async function AdminProvidersPage() {
  await requireUserPage("/admin/providers");

  const [providers, users] = await Promise.all([
    listAdminSharedProviders(),
    listAdminUsers({ limit: 100 }),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Admin · Shared API"
        title="共享 API"
        description="把自己的 OpenAI 兼容供应商共享给指定用户。被授权的用户无需自己填写 API Key，即可在设置中选择使用。"
        actions={
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/settings">
              <Settings2 data-icon="inline-start" />
              管理我的供应商
            </Link>
          </Button>
        }
      />

      <div className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">如何共享：</span>
        前往「设置 → AI 供应商」，创建或编辑供应商时勾选「共享给用户」（仅管理员可见），保存后它会出现在这里，再为具体用户授权。
      </div>

      {providers.length === 0 ? (
        <EmptyState
          icon={Cpu}
          title="还没有共享供应商"
          description="在设置中把某个供应商标记为共享，它就会出现在这里。"
          className="mt-6"
          action={
            <Button asChild className="rounded-xl">
              <Link href="/settings">
                <Settings2 data-icon="inline-start" />
                去设置
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-5 space-y-4">
          {providers.map((provider) => (
            <section
              key={provider.id}
              className="rounded-2xl border border-border/60 bg-card/30 p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Cpu className="size-4.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-display text-base font-medium">
                        {provider.name}
                      </h2>
                      <Badge
                        variant="outline"
                        className={cn(
                          "rounded-full px-2 py-0 text-[10px]",
                          provider.status === "active"
                            ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                            : "border-border text-muted-foreground",
                        )}
                      >
                        {provider.status === "active" ? "启用中" : "已停用"}
                      </Badge>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      {provider.model} · {provider.baseUrl}
                    </p>
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <KeyRound className="size-3" />
                        {provider.apiKeyHint || "未设置"}
                      </span>
                      <span>
                        所有者：
                        {provider.owner
                          ? `${provider.owner.displayName} (@${provider.owner.username})`
                          : "未知"}
                      </span>
                      <span>已授权 {provider.grants.length} 人</span>
                    </p>
                  </div>
                </div>

                <ProviderGrantsDialog provider={provider} users={users.items} />
              </div>

              {provider.grants.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5 border-t border-border/50 pt-3">
                  {provider.grants.map((grant) => (
                    <span
                      key={grant.userId}
                      className="rounded-full bg-secondary/60 px-2.5 py-1 text-[10px] text-muted-foreground"
                    >
                      {grant.displayName} · @{grant.username}
                    </span>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
