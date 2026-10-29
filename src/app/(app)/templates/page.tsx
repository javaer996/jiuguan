import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ChevronRight, Layers, Plus, Sparkles } from "lucide-react";
import { getDb } from "@/db";
import { characters, chatTemplates } from "@/db/schema";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";
import { formatRelativeTime, initials } from "@/lib/utils";

export const metadata: Metadata = {
  title: "对话模板",
};

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const context = await requireUserPage("/templates");

  const rows = await getDb()
    .select({
      template: chatTemplates,
      characterName: characters.name,
      characterAvatar: characters.avatarUrl,
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
    .limit(100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Templates"
        title="对话模板"
        description="把角色、世界书、提示词、样式与输出格式打包成一套即开即用的情景。"
        actions={
          <Button asChild className="rounded-xl shadow-glow">
            <Link href="/templates/new">
              <Plus data-icon="inline-start" />
              新建模板
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="模板柜还是空的"
          description="挑一个角色，挂上世界书，再选好提示词与样式，把它保存成随时可以开演的一套情景。"
          className="mt-8"
          action={
            <Button asChild className="rounded-xl shadow-glow">
              <Link href="/templates/new">
                <Plus data-icon="inline-start" />
                组合第一套模板
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>全部模板</span>
            <span>{rows.length} 套</span>
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ template, characterName, characterAvatar }) => (
              <Link
                key={template.id}
                href={`/templates/${template.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/35 p-5 transition-all hover:border-primary/30 hover:bg-card/65 hover:shadow-soft"
              >
                <div className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-primary/[0.06] blur-2xl" />

                <div className="relative flex items-start gap-3">
                  <Avatar className="size-12 rounded-xl">
                    {characterAvatar && (
                      <AvatarImage src={characterAvatar} alt="" />
                    )}
                    <AvatarFallback className="rounded-xl bg-primary/12 font-display text-base text-primary">
                      {characterName ? initials(characterName) : "情"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-lg font-medium">
                      {template.name}
                    </h2>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                      {characterName ?? "未绑定角色"}
                    </p>
                  </div>
                  <Sparkles className="size-4 shrink-0 text-primary/50 transition-colors group-hover:text-primary" />
                </div>

                <p className="relative mt-3 line-clamp-2 min-h-9 text-xs leading-relaxed text-muted-foreground">
                  {template.description || "还没有写下这套情景的说明。"}
                </p>

                <div className="relative mt-3 flex flex-wrap gap-1.5 text-[10px] text-muted-foreground">
                  <span className="rounded-md bg-secondary/70 px-1.5 py-0.5">
                    {(template.worldbookIds ?? []).length} 本世界书
                  </span>
                  {template.promptPresetId && (
                    <span className="rounded-md bg-secondary/70 px-1.5 py-0.5">
                      提示词
                    </span>
                  )}
                  {template.chatStyleId && (
                    <span className="rounded-md bg-secondary/70 px-1.5 py-0.5">
                      样式
                    </span>
                  )}
                  {template.outputSchemaId && (
                    <span className="rounded-md bg-secondary/70 px-1.5 py-0.5">
                      结构化输出
                    </span>
                  )}
                </div>

                <div className="relative mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                  <span>
                    {template.usageCount > 0
                      ? `已使用 ${template.usageCount} 次`
                      : `更新于 ${formatRelativeTime(template.updatedAt)}`}
                  </span>
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
