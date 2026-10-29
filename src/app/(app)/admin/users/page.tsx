import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound, ShieldCheck, UserRound } from "lucide-react";
import { UserActions } from "@/components/admin/user-actions";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { SearchInput } from "@/components/common/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { listAdminUsers } from "@/lib/admin/query";
import { requireUserPage } from "@/lib/auth/page";
import { cn, formatRelativeTime, initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "用户管理",
};

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { key: "", label: "全部" },
  { key: "active", label: "正常" },
  { key: "suspended", label: "已停用" },
  { key: "deleted", label: "已删除" },
] as const;

const STATUS_LABEL: Record<string, string> = {
  active: "正常",
  suspended: "已停用",
  deleted: "已删除",
};

type AdminUsersPageProps = {
  searchParams: Promise<{
    q?: string;
    status?: string;
    role?: string;
    page?: string;
  }>;
};

function buildHref(
  params: Record<string, string | undefined>,
  patch: Record<string, string | undefined>,
) {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...patch })) {
    if (value) next.set(key, value);
  }
  const query = next.toString();
  return query ? `/admin/users?${query}` : "/admin/users";
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const context = await requireUserPage("/admin/users");
  const sp = await searchParams;

  const status = STATUS_TABS.some((tab) => tab.key === sp.status)
    ? (sp.status as "active" | "suspended" | "deleted" | undefined)
    : undefined;
  const role = sp.role === "admin" ? "admin" : undefined;
  const page = Math.max(1, Number(sp.page) || 1);
  const limit = 30;
  const params = { q: sp.q, status: sp.status, role: sp.role };

  const { items, total } = await listAdminUsers({
    q: sp.q,
    status: status || undefined,
    role,
    limit,
    offset: (page - 1) * limit,
  });

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Admin · People"
        title="用户管理"
        description="查看注册用户，调整角色与账号状态；删除会立即撤销该用户的所有会话。"
        actions={
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/admin/invites">
              <KeyRound data-icon="inline-start" />
              邀请码
            </Link>
          </Button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 rounded-full bg-secondary/40 p-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.key || "all"}
              href={buildHref(params, {
                status: tab.key || undefined,
                page: undefined,
              })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs transition-colors",
                (sp.status ?? "") === tab.key
                  ? "bg-background font-medium text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={buildHref(params, {
              role: role ? undefined : "admin",
              page: undefined,
            })}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
              role
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:text-foreground",
            )}
          >
            <ShieldCheck className="size-3.5" />
            仅管理员
          </Link>
          <SearchInput placeholder="搜索用户名、昵称或邮箱" />
        </div>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        共 {total} 位用户
        {page > 1 && ` · 第 ${page} / ${totalPages} 页`}
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="没有匹配的用户"
          description="换一个关键词，或清除筛选条件再看看。"
          className="mt-6"
        />
      ) : (
        <div className="mt-3 overflow-hidden rounded-2xl border border-border/60 bg-card/25">
          <div className="hidden grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_7rem_8rem_7rem_2.5rem] gap-3 border-b border-border/50 px-4 py-2.5 text-[10px] tracking-wide text-muted-foreground uppercase sm:grid">
            <span>用户</span>
            <span>邮箱</span>
            <span>角色</span>
            <span>状态</span>
            <span>最近登录</span>
            <span />
          </div>

          {items.map((user) => (
            <div
              key={user.id}
              className="grid gap-3 border-b border-border/40 px-4 py-3.5 last:border-b-0 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_7rem_8rem_7rem_2.5rem] sm:items-center"
            >
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-9 shrink-0">
                  {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt="" />}
                  <AvatarFallback className="bg-primary/12 text-[10px] font-medium text-primary">
                    {initials(user.displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {user.displayName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    @{user.username} · 加入于{" "}
                    {formatRelativeTime(user.createdAt)}
                  </p>
                </div>
              </div>

              <div className="truncate text-xs text-muted-foreground">
                {user.email || "—"}
              </div>

              <div>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2 py-0 text-[10px]",
                    user.role === "admin"
                      ? "border-primary/30 text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {user.role === "admin" ? "管理员" : "用户"}
                </Badge>
              </div>

              <div>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-2 py-0 text-[10px]",
                    user.status === "active"
                      ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                      : user.status === "suspended"
                        ? "border-amber-500/30 text-amber-600 dark:text-amber-400"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {STATUS_LABEL[user.status] ?? user.status}
                </Badge>
              </div>

              <div className="text-[11px] text-muted-foreground">
                {user.lastLoginAt
                  ? formatRelativeTime(user.lastLoginAt)
                  : "从未登录"}
              </div>

              <div className="flex justify-end">
                <UserActions
                  userId={user.id}
                  username={user.username}
                  role={user.role}
                  status={user.status}
                  isSelf={user.id === context.user.id}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {page <= 1 ? (
            <Button variant="outline" size="sm" disabled className="rounded-lg">
              上一页
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link
                href={buildHref(params, {
                  page: page > 2 ? String(page - 1) : undefined,
                })}
              >
                上一页
              </Link>
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {page} / {totalPages}
          </span>
          {page >= totalPages ? (
            <Button variant="outline" size="sm" disabled className="rounded-lg">
              下一页
            </Button>
          ) : (
            <Button variant="outline" size="sm" asChild className="rounded-lg">
              <Link href={buildHref(params, { page: String(page + 1) })}>
                下一页
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
