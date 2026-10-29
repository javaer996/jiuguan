import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull, like, or } from "drizzle-orm";
import { ChevronRight, Plus, Sparkles, Users } from "lucide-react";
import { getDb } from "@/db";
import { characters } from "@/db/schema";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { ImportDialog } from "@/components/import/import-dialog";
import { SearchInput } from "@/components/common/search-input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";
import { likePattern } from "@/lib/content/query";
import { formatRelativeTime, initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "角色",
};

export const dynamic = "force-dynamic";

const SOURCE_LABEL: Record<string, string> = {
  manual: "手写",
  ai: "AI 生成",
  import: "导入",
};

export default async function CharactersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const context = await requireUserPage("/characters");
  const { q } = await searchParams;
  const query = q?.trim();

  const conditions = [
    eq(characters.userId, context.user.id),
    isNull(characters.deletedAt),
  ];
  if (query) {
    const pattern = likePattern(query);
    const search = or(
      like(characters.name, pattern),
      like(characters.tagline, pattern),
    );
    if (search) conditions.push(search);
  }

  const rows = await getDb()
    .select()
    .from(characters)
    .where(and(...conditions))
    .orderBy(desc(characters.updatedAt))
    .limit(100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Characters"
        title="角色"
        description="塑造有呼吸感的角色，让他们带着自己的语气与记忆走进对话。"
        actions={
          <>
            <SearchInput placeholder="搜索角色…" />
            <ImportDialog kind="character" />
            <Button asChild className="rounded-xl shadow-glow">
              <Link href="/characters/new">
                <Plus data-icon="inline-start" />
                新建角色
              </Link>
            </Button>
          </>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={query ? Sparkles : Users}
          title={query ? "没有找到这位角色" : "还没有角色入住酒馆"}
          description={
            query
              ? `没有与「${query}」匹配的角色，换个关键词试试，或创建一个新的。`
              : "从名字、语气和一句开场白开始。你可以手写，也可以让 AI 起草，再慢慢打磨。"
          }
          className="mt-8"
          action={
            <Button asChild className="rounded-xl shadow-glow">
              <Link href="/characters/new">
                <Plus data-icon="inline-start" />
                创建第一位角色
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>{query ? `“${query}” 的结果` : "全部角色"}</span>
            <span>{rows.length} 位</span>
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((character) => (
              <Link
                key={character.id}
                href={`/characters/${character.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/35 p-5 transition-all hover:border-primary/30 hover:bg-card/65 hover:shadow-soft"
              >
                <div className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-primary/[0.06] blur-2xl transition-opacity group-hover:opacity-100" />

                <div className="relative flex items-start gap-3.5">
                  <Avatar className="size-14 rounded-2xl">
                    {character.avatarUrl && (
                      <AvatarImage src={character.avatarUrl} alt="" />
                    )}
                    <AvatarFallback className="rounded-2xl bg-primary/12 font-display text-lg text-primary">
                      {initials(character.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate font-display text-lg font-medium">
                        {character.name}
                      </h2>
                      <Badge
                        variant="outline"
                        className="shrink-0 px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
                      >
                        {SOURCE_LABEL[character.source] ?? "角色"}
                      </Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {character.tagline ||
                        character.description ||
                        "还没有写下简介。"}
                    </p>
                  </div>
                </div>

                <div className="relative mt-4 flex min-h-5 flex-wrap gap-1.5">
                  {(character.tags ?? []).slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                <div className="relative mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                  <span>更新于 {formatRelativeTime(character.updatedAt)}</span>
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
