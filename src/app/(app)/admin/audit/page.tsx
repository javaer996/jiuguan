import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { listAdminAudit } from "@/lib/admin/query";
import { requireUserPage } from "@/lib/auth/page";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "审计日志",
};

export const dynamic = "force-dynamic";

const ACTION_LABEL: Record<string, string> = {
  "user.update": "修改用户",
  "user.delete": "删除用户",
  "invite.create": "生成邀请码",
  "invite.update": "修改邀请码",
  "provider.grant": "授权共享 API",
  "provider.revoke": "撤销共享 API",
  "settings.update": "修改系统设置",
  "plaza.approve": "通过投稿",
  "plaza.reject": "退回投稿",
  "plaza.archive": "下架投稿",
  "plaza.feature": "推荐投稿",
  "plaza.unfeature": "取消推荐",
  "plaza_category.create": "新建广场分类",
  "plaza_category.update": "修改广场分类",
  "plaza_category.delete": "删除广场分类",
};

function detailSummary(detail: Record<string, unknown> | null) {
  if (!detail) return "—";
  return Object.entries(detail)
    .filter(([, value]) => value !== null && value !== undefined)
    .slice(0, 4)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

export default async function AdminAuditPage() {
  await requireUserPage("/admin/audit");
  const logs = await listAdminAudit(150);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Admin · Audit"
        title="审计日志"
        description="记录管理员的敏感操作，方便回溯是谁在什么时候改了什么。最近 150 条。"
      />

      {logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="还没有审计记录"
          description="当管理员修改用户、邀请码或系统设置时，记录会出现在这里。"
          className="mt-6"
        />
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-border/60 bg-card/25">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-border/40 px-4 py-3.5 last:border-b-0"
            >
              <div className="flex min-w-0 items-start gap-3">
                <Badge
                  variant="outline"
                  className="mt-0.5 shrink-0 rounded-full px-2 py-0 text-[10px] text-muted-foreground"
                >
                  {ACTION_LABEL[log.action] ?? log.action}
                </Badge>
                <div className="min-w-0">
                  <p className="text-xs">
                    <span className="font-medium">
                      {log.actor?.displayName ?? "已删除的用户"}
                    </span>
                    {log.actor && (
                      <span className="text-muted-foreground">
                        {" "}
                        @{log.actor.username}
                      </span>
                    )}
                    {log.targetType && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {log.targetType}
                        {log.targetId ? ` ${log.targetId.slice(0, 8)}…` : ""}
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {detailSummary(log.detail)}
                  </p>
                </div>
              </div>
              <div className="text-right text-[10px] text-muted-foreground">
                <p>{formatRelativeTime(log.createdAt)}</p>
                {log.ip && <p className="font-mono">{log.ip}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
