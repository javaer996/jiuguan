import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull, like, or, sql } from "drizzle-orm";
import {
  BookOpen,
  ChevronRight,
  Layers,
  Search,
  Sparkles,
} from "lucide-react";
import { getDb } from "@/db";
import { worldbookEntries, worldbooks } from "@/db/schema";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ImportDialog } from "@/components/import/import-dialog";
import { SearchInput } from "@/components/common/search-input";
import { Badge } from "@/components/ui/badge";
import { NewWorldbookButton } from "@/components/worldbooks/new-worldbook-button";
import { requireUserPage } from "@/lib/auth/page";
import { likePattern } from "@/lib/content/query";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "世界书",
};

export const dynamic = "force-dynamic";

export default async function WorldbooksPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const context = await requireUserPage("/worldbooks");
  const { q } = await searchParams;
  const query = q?.trim();

  const conditions = [
    eq(worldbooks.userId, context.user.id),
    isNull(worldbooks.deletedAt),
  ];
  if (query) {
    const pattern = likePattern(query);
    const search = or(
      like(worldbooks.name, pattern),
      like(worldbooks.description, pattern),
    );
    if (search) conditions.push(search);
  }

  const entryCount = sql<number>`(
    SELECT COUNT(*) FROM ${worldbookEntries}
    WHERE ${worldbookEntries.worldbookId} = ${worldbooks.id}
  )`;

  const rows = await getDb()
    .select({ worldbook: worldbooks, entryCount })
    .from(worldbooks)
    .where(and(...conditions))
    .orderBy(desc(worldbooks.updatedAt))
    .limit(100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Worldbooks"
        title="世界书"
        description="为故事建立设定与规则，让世界随剧情自然生长。"
        actions={
          <>
            <SearchInput placeholder="搜索世界书…" />
            <ImportDialog kind="worldbook" />
            <NewWorldbookButton />
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={query ? Search : BookOpen}
          title={query ? "没有找到这本世界书" : "书架还是空的"}
          description={
            query
              ? `没有与「${query}」匹配的世界书，换个关键词试试。`
              : "从一座城、一条规则或一个秘密开始。世界书会在关键词出现时，把设定悄悄递给 AI。"
          }
          className="mt-8"
          action={<NewWorldbookButton />}
        />
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>{query ? `“${query}” 的结果` : "全部世界书"}</span>
            <span>{rows.length} 本</span>
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ worldbook, entryCount: count }) => (
              <Link
                key={worldbook.id}
                href={`/worldbooks/${worldbook.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/35 p-5 transition-all hover:border-primary/30 hover:bg-card/65 hover:shadow-soft"
              >
                <div className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-accent/[0.08] blur-2xl" />

                <div className="relative flex items-start gap-3.5">
                  <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                    <BookOpen className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-lg font-medium">
                      {worldbook.name}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {worldbook.description || "还没有写下简介。"}
                    </p>
                  </div>
                </div>

                <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant="secondary"
                    className="rounded-md px-1.5 py-0 text-[10px] font-normal"
                  >
                    <Layers className="size-2.5" />
                    {Number(count)} 条
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-md px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                  >
                    扫描 {worldbook.scanDepth} 条
                  </Badge>
                  <Badge
                    variant="outline"
                    className="rounded-md px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                  >
                    预算 {worldbook.tokenBudget}
                  </Badge>
                  {worldbook.recursive && (
                    <Badge
                      variant="outline"
                      className="rounded-md px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                    >
                      <Sparkles className="size-2.5" />
                      递归
                    </Badge>
                  )}
                </div>

                <div className="relative mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                  <span>更新于 {formatRelativeTime(worldbook.updatedAt)}</span>
                  <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
