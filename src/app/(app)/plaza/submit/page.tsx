import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import {
  ArrowRight,
  Compass,
  FileClock,
  Layers,
  Plus,
  Send,
  ShieldCheck,
} from "lucide-react";
import { getDb } from "@/db";
import { characters, chatTemplates } from "@/db/schema";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import {
  SubmissionForm,
  type SubmissionTemplateOption,
} from "@/components/plaza/submission-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";
import {
  listMySubmissions,
  listPlazaCategories,
} from "@/lib/plaza/query";
import type { PlazaStatus } from "@/lib/types/plaza";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "投稿情景",
};

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<PlazaStatus, string> = {
  draft: "草稿",
  pending: "待审核",
  published: "已发布",
  rejected: "未通过",
  archived: "已下架",
};

const STATUS_VARIANTS: Record<
  PlazaStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  pending: "secondary",
  published: "default",
  rejected: "destructive",
  archived: "outline",
};

type SubmitPageProps = {
  searchParams: Promise<{ plazaTemplateId?: string; templateId?: string }>;
};

export default async function PlazaSubmitPage({
  searchParams,
}: SubmitPageProps) {
  const context = await requireUserPage("/plaza/submit");
  const sp = await searchParams;

  const db = getDb();
  const [templateRows, categories, submissions] = await Promise.all([
    db
      .select({
        id: chatTemplates.id,
        name: chatTemplates.name,
        worldbookIds: chatTemplates.worldbookIds,
        characterName: characters.name,
      })
      .from(chatTemplates)
      .leftJoin(characters, eq(characters.id, chatTemplates.characterId))
      .where(
        and(
          eq(chatTemplates.userId, context.user.id),
          isNull(chatTemplates.deletedAt),
        ),
      )
      .orderBy(desc(chatTemplates.updatedAt))
      .limit(100),
    listPlazaCategories(),
    listMySubmissions(context.user.id),
  ]);

  const templates: SubmissionTemplateOption[] = templateRows.map((row) => ({
    id: row.id,
    name: row.name,
    characterName: row.characterName,
    worldbookCount: (row.worldbookIds ?? []).length,
  }));

  const existing = sp.plazaTemplateId
    ? submissions.find((item) => item.id === sp.plazaTemplateId)
    : undefined;
  const selectedTemplate = sp.templateId
    ? templates.find((item) => item.id === sp.templateId)
    : undefined;

  const initial = existing
    ? {
        plazaTemplateId: existing.id,
        templateId: sp.templateId,
        title: existing.title,
        summary: existing.summary ?? "",
        categoryId: existing.category?.id ?? "",
        tags: existing.tags,
      }
    : {
        templateId: sp.templateId,
        title: selectedTemplate?.name ?? "",
      };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Submit a scene"
        title="投稿情景"
        description="把你的角色、世界书、提示词与样式打包成一套情景，交给广场上的旅人。"
        actions={
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="/plaza">
              <Compass data-icon="inline-start" />
              回到广场
            </Link>
          </Button>
        }
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          {templates.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="还没有可以投稿的模板"
              description="先创建一套对话模板，把角色、世界书、提示词和样式组合起来，再回来投稿。"
              action={
                <Button asChild className="rounded-xl shadow-glow">
                  <Link href="/templates/new">
                    <Plus data-icon="inline-start" />
                    创建对话模板
                  </Link>
                </Button>
              }
            />
          ) : (
            <SubmissionForm
              templates={templates}
              categories={categories.map((category) => ({
                id: category.id,
                name: category.name,
              }))}
              initial={initial}
            />
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-medium">
              <ShieldCheck className="size-4 text-primary" />
              投稿须知
            </h2>
            <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-muted-foreground">
              <li>· 请确保你拥有投稿内容的权利，不要搬运他人作品。</li>
              <li>· 审核通过后，角色、世界书与样式会以快照形式公开。</li>
              <li>· API Key、供应商与私人身份信息不会进入快照。</li>
              <li>· 更新模板后，需要重新提交版本才会同步到广场。</li>
            </ul>
          </section>

          <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
            <h2 className="flex items-center gap-2 font-display text-base font-medium">
              <FileClock className="size-4 text-primary" />
              审核流程
            </h2>
            <ol className="mt-3 space-y-2.5 text-xs leading-relaxed text-muted-foreground">
              <li>1. 提交后状态变为「待审核」。</li>
              <li>2. 管理员会检查内容与格式。</li>
              <li>3. 通过后出现在兴趣广场，可被一键使用。</li>
              <li>4. 未通过时会显示审核意见，修改后可重新提交。</li>
            </ol>
          </section>
        </aside>
      </div>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-xl font-medium">
            <Send className="size-4 text-primary" />
            我的投稿
          </h2>
          <span className="text-xs text-muted-foreground">
            {submissions.length} 份
          </span>
        </div>

        {submissions.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-border/70 px-5 py-8 text-center text-sm text-muted-foreground">
            还没有投过稿。选一套得意的情景，让它在广场上亮起来。
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {submissions.map((submission) => (
              <div
                key={submission.id}
                className="rounded-2xl border border-border/60 bg-card/30 p-4 transition-colors hover:border-primary/25"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-display text-base font-medium">
                        {submission.title}
                      </h3>
                      <Badge
                        variant={STATUS_VARIANTS[submission.status]}
                        className="rounded-full"
                      >
                        {STATUS_LABELS[submission.status]}
                      </Badge>
                      {submission.featured && (
                        <Badge variant="outline" className="rounded-full">
                          推荐
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {submission.summary || "没有填写简介"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      {submission.category && (
                        <span>{submission.category.name}</span>
                      )}
                      <span>
                        最新 v{submission.latestVersion ?? "—"}
                        {submission.publishedVersion
                          ? ` · 已发布 v${submission.publishedVersion}`
                          : ""}
                      </span>
                      <span>
                        提交于{" "}
                        {formatRelativeTime(
                          submission.submittedAt ?? submission.updatedAt,
                        )}
                      </span>
                      <span>{submission.cloneCount} 次使用</span>
                    </div>
                    {submission.status === "rejected" &&
                      submission.rejectReason && (
                        <p className="mt-2 rounded-lg bg-destructive/5 px-2.5 py-1.5 text-[11px] text-destructive">
                          审核意见：{submission.rejectReason}
                        </p>
                      )}
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {submission.publishedVersion && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="rounded-lg"
                      >
                        <Link href={`/plaza/${submission.id}`}>
                          查看
                          <ArrowRight data-icon="inline-end" />
                        </Link>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="rounded-lg"
                    >
                      <Link
                        href={`/plaza/submit?plazaTemplateId=${submission.id}`}
                      >
                        提交新版本
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
