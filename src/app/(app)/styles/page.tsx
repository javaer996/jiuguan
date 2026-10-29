import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ChevronRight, Palette, Plus } from "lucide-react";
import { getDb } from "@/db";
import { chatStyles } from "@/db/schema";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";
import { STYLE_PRESETS } from "@/lib/content/defaults";
import { cn, formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "对话样式",
};

export const dynamic = "force-dynamic";

const LAYOUT_LABEL: Record<string, string> = {
  bubble: "气泡对话",
  novel: "小说排版",
  messenger: "即时通讯",
  document: "文档信笺",
};

export default async function StylesPage() {
  const context = await requireUserPage("/styles");

  const rows = await getDb()
    .select()
    .from(chatStyles)
    .where(
      and(eq(chatStyles.userId, context.user.id), isNull(chatStyles.deletedAt)),
    )
    .orderBy(desc(chatStyles.updatedAt))
    .limit(100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Styles"
        title="对话样式"
        description="从气泡到小说排版，让文字以你喜欢的样子出现。样式会随对话一起保存快照。"
        actions={
          <Button asChild className="rounded-xl shadow-glow">
            <Link href="/styles/new">
              <Plus data-icon="inline-start" />
              新建样式
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="样式工坊还空着"
          description="选一套内置预设作为起点，再调整字号、行高与强调色，做出属于你的阅读质感。"
          className="mt-8"
          action={
            <Button asChild className="rounded-xl shadow-glow">
              <Link href="/styles/new">
                <Plus data-icon="inline-start" />
                创建第一套样式
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>全部样式</span>
            <span>{rows.length} 套</span>
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((style) => {
              const preset = STYLE_PRESETS.find(
                (item) => item.key === style.builtInKey,
              );
              const accent = style.config?.accentColor || "#c9a45c";
              const layout = style.config?.layout ?? "bubble";
              return (
                <Link
                  key={style.id}
                  href={`/styles/${style.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/35 p-5 transition-all hover:border-primary/30 hover:bg-card/65 hover:shadow-soft"
                >
                  <div className="pointer-events-none absolute -top-16 -right-10 size-40 rounded-full bg-primary/[0.06] blur-2xl" />

                  <div className="relative flex items-center justify-between gap-3">
                    <span className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
                      {LAYOUT_LABEL[layout] ?? "自定义"}
                    </span>
                    <span
                      className="size-4 rounded-full border border-white/10"
                      style={{ background: accent }}
                    />
                  </div>

                  <div className="relative mt-3 space-y-2">
                    <div
                      className={cn(
                        "max-w-[85%] rounded-xl border border-border/50 bg-secondary/45 px-3 py-2 text-[11px] text-muted-foreground",
                        layout === "novel" || layout === "document"
                          ? "max-w-full rounded-none border-0 border-l-2 bg-transparent pl-2"
                          : "",
                      )}
                      style={
                        layout === "novel" || layout === "document"
                          ? { borderColor: accent }
                          : undefined
                      }
                    >
                      今晚的酒馆比往常安静。
                    </div>
                    <div
                      className={cn(
                        "ml-auto max-w-[85%] rounded-xl border px-3 py-2 text-[11px]",
                        layout === "novel" || layout === "document"
                          ? "max-w-full rounded-none border-0 border-l-2 bg-transparent pl-2 text-foreground"
                          : "",
                      )}
                      style={{
                        borderColor:
                          layout === "novel" || layout === "document"
                            ? accent
                            : `${accent}40`,
                        background:
                          layout === "novel" || layout === "document"
                            ? undefined
                            : `${accent}14`,
                      }}
                    >
                      窗边吧。炉火正好。
                    </div>
                  </div>

                  <h2 className="relative mt-4 truncate font-display text-lg font-medium">
                    {style.name}
                  </h2>
                  <p className="relative mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
                    {style.description || preset?.description || "自定义样式"}
                  </p>

                  <div className="relative mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                    <span>更新于 {formatRelativeTime(style.updatedAt)}</span>
                    <ChevronRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
