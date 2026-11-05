import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Archive,
  CheckCircle2,
  Clock3,
  Compass,
  ExternalLink,
  Tags,
  XCircle,
} from "lucide-react";
import { PlazaReviewActions } from "@/components/admin/plaza-review-actions";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";
import { countPlazaSubmissions, listAdminSubmissions } from "@/lib/plaza/query";
import type { PlazaStatus } from "@/lib/types/plaza";
import { formatRelativeTime, initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "广场审核",
};

export const dynamic = "force-dynamic";

const TABS: { key: PlazaStatus; label: string }[] = [
  { key: "pending", label: "待审核" },
  { key: "published", label: "已发布" },
  { key: "rejected", label: "未通过" },
  { key: "archived", label: "已下架" },
];

type AdminPlazaPageProps = {
  searchParams: Promise<{ status?: string }>;
};

export default async function AdminPlazaPage({
  searchParams,
}: AdminPlazaPageProps) {
  const context = await requireUserPage("/admin/plaza");
  if (context.user.role !== "admin") redirect("/chats");

  const sp = await searchParams;
  const status: PlazaStatus = TABS.some((tab) => tab.key === sp.status)
    ? (sp.status as PlazaStatus)
    : "pending";

  const [submissions, counts] = await Promise.all([
    listAdminSubmissions(status),
    countPlazaSubmissions(),
  ]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Admin · Plaza"
        title="广场审核"
        description="检查投稿的角色、世界书与内容，通过后旅人才能在广场上使用。"
        actions={
          <>
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/admin">
                <Compass data-icon="inline-start" />
                管理后台
              </Link>
            </Button>
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/admin/plaza/categories">
                <Tags data-icon="inline-start" />
                分类管理
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "待审核",
            value: counts.pending,
            icon: Clock3,
            className: "text-amber-500",
          },
          {
            label: "已发布",
            value: counts.published,
            icon: CheckCircle2,
            className: "text-emerald-500",
          },
          {
            label: "未通过",
            value: counts.rejected,
            icon: XCircle,
            className: "text-destructive",
          },
          {
            label: "已下架",
            value: counts.archived,
            icon: Archive,
            className: "text-muted-foreground",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/30 px-4 py-3"
          >
            <stat.icon className={`size-4 ${stat.className}`} />
            <div>
              <p className="font-display text-xl font-medium">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-1 rounded-full bg-secondary/40 p-1">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={
              tab.key === "pending"
                ? "/admin/plaza"
                : `/admin/plaza?status=${tab.key}`
            }
            className={
              status === tab.key
                ? "rounded-full bg-background px-3.5 py-1.5 text-xs text-foreground shadow-sm"
                : "rounded-full px-3.5 py-1.5 text-xs text-muted-foreground hover:text-foreground"
            }
          >
            {tab.label}
            <span className="ml-1 text-[10px] opacity-60">
              {counts[tab.key]}
            </span>
          </Link>
        ))}
      </div>

      {submissions.length === 0 ? (
        <EmptyState
          icon={status === "pending" ? CheckCircle2 : Archive}
          title={status === "pending" ? "审核队列已经清空" : "这里还没有内容"}
          description={
            status === "pending"
              ? "炉火边暂时没有新的投稿，去广场看看已经上架的情景吧。"
              : "切换到其他状态，或等待新的投稿。"
          }
          className="mt-6"
          action={
            <Button variant="outline" asChild className="rounded-xl">
              <Link href="/plaza">去广场看看</Link>
            </Button>
          }
        />
      ) : (
        <div className="mt-5 space-y-3">
          {submissions.map((submission) => {
            const snapshot = submission.snapshot;
            const worldbookEntryCount =
              snapshot?.worldbooks.reduce(
                (sum, book) => sum + book.entries.length,
                0,
              ) ?? 0;

            return (
              <div
                key={submission.id}
                className="rounded-2xl border border-border/60 bg-card/30 p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row">
                  <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-secondary/40 sm:w-36">
                    {submission.coverUrl ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                          backgroundImage: `url("${submission.coverUrl}")`,
                        }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center font-display text-2xl text-primary/40">
                        {initials(submission.title)}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-medium">
                        {submission.title}
                      </h2>
                      {submission.category && (
                        <Badge variant="outline" className="rounded-full">
                          {submission.category.name}
                        </Badge>
                      )}
                      {submission.featured && (
                        <Badge className="rounded-full">推荐</Badge>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {submission.summary || "没有填写简介"}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar className="size-5 rounded-full">
                          {submission.author.avatarUrl && (
                            <AvatarImage
                              src={submission.author.avatarUrl}
                              alt=""
                            />
                          )}
                          <AvatarFallback className="rounded-full bg-primary/10 text-[9px] text-primary">
                            {initials(submission.author.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        {submission.author.displayName}
                      </span>
                      <span>
                        提交于{" "}
                        {formatRelativeTime(
                          submission.submittedAt ?? submission.updatedAt,
                        )}
                      </span>
                      <span>最新 v{submission.latestVersion ?? "—"}</span>
                      {snapshot && (
                        <span>
                          角色 · {snapshot.character.name}
                          {snapshot.worldbooks.length > 0
                            ? ` · ${snapshot.worldbooks.length} 本世界书 / ${worldbookEntryCount} 条设定`
                            : ""}
                        </span>
                      )}
                    </div>

                    {submission.tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {submission.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {submission.changelog && (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        版本说明：{submission.changelog}
                      </p>
                    )}

                    {submission.rejectReason && (
                      <p className="mt-2 rounded-lg bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive">
                        上次审核意见：{submission.rejectReason}
                      </p>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
                      <PlazaReviewActions
                        templateId={submission.id}
                        title={submission.title}
                        featured={submission.featured}
                        published={submission.published}
                        status={submission.status}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="rounded-lg text-muted-foreground"
                      >
                        <Link href={`/plaza/${submission.id}`}>
                          查看详情
                          <ExternalLink data-icon="inline-end" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
