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
import { layoutLabel } from "@/lib/chat/layouts";
import { STYLE_PRESETS } from "@/lib/content/defaults";
import { formatRelativeTime, withAlpha } from "@/lib/utils";

export const metadata: Metadata = {
  title: "对话样式",
};

export const dynamic = "force-dynamic";

function DropCap({ char, accent }: { char: string; accent: string }) {
  return (
    <span
      className="float-left mr-1 font-display text-[2.3em] leading-[0.85] font-semibold"
      style={{ color: accent }}
    >
      {char}
    </span>
  );
}

function StyleCardPreview({
  layout,
  accent,
  userAccent,
  assistantAccent,
  userTextColor,
  assistantTextColor,
  dropCap,
}: {
  layout: string;
  accent: string;
  userAccent?: string;
  assistantAccent?: string;
  userTextColor?: string;
  assistantTextColor?: string;
  dropCap?: boolean;
}) {
  const userAccentValue = userAccent || accent;
  const assistantAccentValue = assistantAccent || accent;

  if (layout === "novel") {
    return (
      <div className="mt-3 overflow-hidden rounded-lg bg-secondary/20 px-3 py-2.5 font-display text-[11px] leading-relaxed text-muted-foreground">
        <p
          className="text-foreground"
          style={{ color: assistantTextColor || undefined }}
        >
          {dropCap && <DropCap char="今" accent={assistantAccentValue} />}
          晚的酒馆比往常安静。炉火正好，窗边还留着你的位置。
        </p>
        <p
          className="mt-1.5 text-right text-[10px] italic"
          style={{ color: userTextColor || undefined }}
        >
          窗边吧。炉火正好。
        </p>
      </div>
    );
  }

  if (layout === "document") {
    return (
      <div className="relative mt-3 overflow-hidden rounded-lg border border-primary/25 bg-card/60 px-3.5 py-3 font-display text-[11px] leading-relaxed text-muted-foreground">
        <div className="pointer-events-none absolute inset-1.5 rounded-md border border-primary/10" />
        <p
          className="relative text-foreground"
          style={{ color: assistantTextColor || undefined }}
        >
          {dropCap && <DropCap char="今" accent={assistantAccentValue} />}
          晚的酒馆比往常安静。炉火正好，窗边还留着你的位置。
        </p>
        <p
          className="relative mt-2 text-right text-[10px] italic"
          style={{ color: userTextColor || undefined }}
        >
          —— 窗边吧，炉火正好。
        </p>
        <span className="absolute right-3 bottom-1 text-[10px] text-primary/40">
          ❦
        </span>
      </div>
    );
  }

  if (layout === "messenger") {
    return (
      <div className="mt-3 space-y-1.5">
        <p
          className="text-[9px] tracking-wide text-muted-foreground/70"
          style={{ color: assistantAccentValue }}
        >
          月见 · 22:14
        </p>
        <div
          className="max-w-[88%] rounded-lg rounded-bl-[0.3rem] border px-2.5 py-1.5 text-[11px]"
          style={{
            borderColor: withAlpha(assistantAccentValue, 0.3),
            background: withAlpha(assistantAccentValue, 0.06),
            color: assistantTextColor || undefined,
          }}
        >
          今晚的酒馆比往常安静。
        </div>
        <div
          className="ml-auto max-w-[80%] rounded-lg rounded-br-[0.3rem] border px-2.5 py-1.5 text-[11px]"
          style={{
            borderColor: withAlpha(userAccentValue, 0.35),
            background: withAlpha(userAccentValue, 0.12),
            color: userTextColor || undefined,
          }}
        >
          窗边吧。炉火正好。
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div
        className="max-w-[85%] rounded-xl border px-3 py-2 text-[11px]"
        style={{
          borderColor: withAlpha(assistantAccentValue, 0.28),
          background: withAlpha(assistantAccentValue, 0.06),
          color: assistantTextColor || undefined,
        }}
      >
        今晚的酒馆比往常安静。
      </div>
      <div
        className="ml-auto max-w-[85%] rounded-xl border px-3 py-2 text-[11px]"
        style={{
          borderColor: withAlpha(userAccentValue, 0.3),
          background: withAlpha(userAccentValue, 0.1),
          color: userTextColor || undefined,
        }}
      >
        窗边吧。炉火正好。
      </div>
    </div>
  );
}

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
              const userAccent = style.config?.userAccentColor;
              const assistantAccent = style.config?.assistantAccentColor;
              const userTextColor = style.config?.userTextColor;
              const assistantTextColor = style.config?.assistantTextColor;
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
                      {layoutLabel(layout)}
                    </span>
                    <span
                      className="size-4 rounded-full border border-white/10"
                      style={{ background: accent }}
                    />
                  </div>

                  <StyleCardPreview
                    layout={layout}
                    accent={accent}
                    userAccent={userAccent}
                    assistantAccent={assistantAccent}
                    userTextColor={userTextColor}
                    assistantTextColor={assistantTextColor}
                    dropCap={Boolean(style.config?.dropCap)}
                  />

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
