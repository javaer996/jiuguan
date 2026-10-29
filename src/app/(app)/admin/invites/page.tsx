import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, Users } from "lucide-react";
import { InviteActions } from "@/components/admin/invite-actions";
import { InviteCreateDialog } from "@/components/admin/invite-create-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listAdminInvites } from "@/lib/admin/query";
import { requireUserPage } from "@/lib/auth/page";
import { cn, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "邀请码",
};

export const dynamic = "force-dynamic";

function inviteStatus(invite: {
  disabled: boolean;
  usedCount: number;
  maxUses: number;
  expiresAt: string | null;
}) {
  if (invite.disabled) return { label: "已停用", tone: "muted" };
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() <= Date.now()) {
    return { label: "已过期", tone: "muted" };
  }
  if (invite.usedCount >= invite.maxUses) {
    return { label: "已用完", tone: "muted" };
  }
  return { label: "可用", tone: "active" };
}

export default async function AdminInvitesPage() {
  await requireUserPage("/admin/invites");
  const invites = await listAdminInvites();

  const available = invites.filter(
    (invite) => inviteStatus(invite).tone === "active",
  ).length;
  const used = invites.reduce((sum, invite) => sum + invite.usedCount, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Admin · Invitations"
        title="邀请码"
        description="酒馆实行邀请制。生成邀请码，交给想邀请的人；停用后立即失效。"
        actions={
          <>
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/admin/users">
                <Users data-icon="inline-start" />
                用户管理
              </Link>
            </Button>
            <InviteCreateDialog />
          </>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        {[
          { label: "邀请码总数", value: invites.length },
          { label: "当前可用", value: available },
          { label: "累计使用", value: used },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-border/60 bg-card/30 px-4 py-3"
          >
            <p className="font-display text-2xl font-medium">{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {invites.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="还没有邀请码"
          description="生成第一枚邀请码，邀请第一位旅人推开酒馆的门。"
          className="mt-6"
          action={<InviteCreateDialog />}
        />
      ) : (
        <div className="mt-5 overflow-hidden rounded-2xl border border-border/60 bg-card/25">
          <div className="hidden grid-cols-[minmax(0,1fr)_8rem_7rem_8rem_minmax(0,1fr)_5rem] gap-3 border-b border-border/50 px-4 py-2.5 text-[10px] tracking-wide text-muted-foreground uppercase sm:grid">
            <span>邀请码</span>
            <span>使用情况</span>
            <span>状态</span>
            <span>创建时间</span>
            <span>备注</span>
            <span />
          </div>

          {invites.map((invite) => {
            const status = inviteStatus(invite);
            return (
              <div
                key={invite.id}
                className="grid gap-2 border-b border-border/40 px-4 py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_8rem_7rem_8rem_minmax(0,1fr)_5rem] sm:items-center sm:gap-3"
              >
                <div>
                  <code className="rounded-md bg-secondary/60 px-2 py-1 font-mono text-xs tracking-wider">
                    {invite.code}
                  </code>
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {invite.createdBy
                      ? `由 ${invite.createdBy.displayName} 创建`
                      : "系统创建"}
                  </p>
                </div>

                <div className="text-xs text-muted-foreground">
                  {invite.usedCount} / {invite.maxUses} 次
                </div>

                <div>
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full px-2 py-0 text-[10px]",
                      status.tone === "active"
                        ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                        : "border-border text-muted-foreground",
                    )}
                  >
                    {status.label}
                  </Badge>
                </div>

                <div className="text-[11px] text-muted-foreground">
                  {formatRelativeTime(invite.createdAt)}
                  {invite.expiresAt && (
                    <span className="block">
                      至 {new Date(invite.expiresAt).toLocaleDateString("zh-CN")}
                    </span>
                  )}
                </div>

                <div className="truncate text-[11px] text-muted-foreground">
                  {invite.note || "—"}
                </div>

                <InviteActions
                  inviteId={invite.id}
                  code={invite.code}
                  disabled={invite.disabled}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
