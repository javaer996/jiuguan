import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ChevronRight, Plus, ScrollText, Star } from "lucide-react";
import { getDb } from "@/db";
import { promptPresets } from "@/db/schema";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "提示词",
};

export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  const context = await requireUserPage("/prompts");

  const rows = await getDb()
    .select()
    .from(promptPresets)
    .where(
      and(
        eq(promptPresets.userId, context.user.id),
        isNull(promptPresets.deletedAt),
      ),
    )
    .orderBy(desc(promptPresets.isDefault), desc(promptPresets.updatedAt))
    .limit(100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Prompts"
        title="提示词"
        description="调整酒馆的说话方式，把系统提示词、提示词块与变量保存成可复用的预设。"
        actions={
          <Button asChild className="rounded-xl shadow-glow">
            <Link href="/prompts/new">
              <Plus data-icon="inline-start" />
              新建预设
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="还没有提示词预设"
          description="从一段系统提示词开始，或者直接使用内置的提示词块，让角色更稳定地说话。"
          className="mt-8"
          action={
            <Button asChild className="rounded-xl shadow-glow">
              <Link href="/prompts/new">
                <Plus data-icon="inline-start" />
                创建第一套预设
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>全部预设</span>
            <span>{rows.length} 套</span>
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((preset) => (
              <Link
                key={preset.id}
                href={`/prompts/${preset.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/35 p-5 transition-all hover:border-primary/30 hover:bg-card/65 hover:shadow-soft"
              >
                <div className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-primary/[0.06] blur-2xl" />

                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <ScrollText className="size-4.5" />
                  </div>
                  {preset.isDefault && (
                    <Badge
                      variant="outline"
                      className="gap-1 border-primary/30 px-1.5 py-0 text-[10px] text-primary"
                    >
                      <Star className="size-2.5 fill-current" />
                      默认
                    </Badge>
                  )}
                </div>

                <h2 className="relative mt-3 truncate font-display text-lg font-medium">
                  {preset.name}
                </h2>
                <p className="relative mt-1 line-clamp-2 min-h-9 text-xs leading-relaxed text-muted-foreground">
                  {preset.description ||
                    preset.systemPrompt ||
                    "还没有写下说明。"}
                </p>

                <div className="relative mt-4 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                  <span className="rounded-md bg-secondary/70 px-1.5 py-0.5">
                    {(preset.blocks ?? []).length} 个块
                  </span>
                  {preset.systemPrompt && (
                    <span className="rounded-md bg-secondary/70 px-1.5 py-0.5">
                      系统提示词
                    </span>
                  )}
                  {preset.variables &&
                    Object.keys(preset.variables).length > 0 && (
                      <span className="rounded-md bg-secondary/70 px-1.5 py-0.5">
                        {Object.keys(preset.variables).length} 个变量
                      </span>
                    )}
                </div>

                <div className="relative mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                  <span>更新于 {formatRelativeTime(preset.updatedAt)}</span>
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
