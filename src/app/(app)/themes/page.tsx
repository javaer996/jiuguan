import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, isNull } from "drizzle-orm";
import { ChevronRight, Palette, Plus } from "lucide-react";
import { getDb } from "@/db";
import { themes } from "@/db/schema";
import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUserPage } from "@/lib/auth/page";
import {
  sanitizeThemeBackgroundUrlSafe,
  sanitizeThemeTokensSafe,
} from "@/lib/theme/tokens";
import { formatRelativeTime } from "@/lib/utils";

export const metadata: Metadata = {
  title: "主题",
};

export const dynamic = "force-dynamic";

const MODE_LABEL: Record<string, string> = {
  dark: "深色",
  light: "浅色",
  both: "通用",
};

export default async function ThemesPage() {
  const context = await requireUserPage("/themes");

  const rows = await getDb()
    .select()
    .from(themes)
    .where(and(eq(themes.userId, context.user.id), isNull(themes.deletedAt)))
    .orderBy(desc(themes.isDefault), desc(themes.updatedAt))
    .limit(100);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:px-6 lg:px-10 lg:py-10">
      <PageHeader
        eyebrow="Themes"
        title="主题"
        description="为聊天页换一种光线与空气。主题只影响对话区域，不会改变整座酒馆的界面。"
        actions={
          <Button asChild className="rounded-xl shadow-glow">
            <Link href="/themes/new">
              <Plus data-icon="inline-start" />
              新建主题
            </Link>
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Palette}
          title="还没有自己的主题"
          description="从暖金酒馆、青灯夜雨或旧纸晨光开始，调整色板、背景与 CSS，做出只属于你的阅读光线。"
          className="mt-8"
          action={
            <Button asChild className="rounded-xl shadow-glow">
              <Link href="/themes/new">
                <Plus data-icon="inline-start" />
                创建第一个主题
              </Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between text-xs text-muted-foreground">
            <span>全部主题</span>
            <span>{rows.length} 套</span>
          </div>

          <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((theme) => {
              const tokens = sanitizeThemeTokensSafe(theme.tokens);
              const backgroundImage = sanitizeThemeBackgroundUrlSafe(
                theme.backgroundUrl,
              );
              const background = tokens["--background"] || "#0d0b12";
              const foreground = tokens["--foreground"] || "#ece7df";
              const primary = tokens["--primary"] || "#e0a45e";
              const secondary = tokens["--secondary"] || "#241f2e";
              const accent = tokens["--accent"] || "#2a2434";

              return (
                <Link
                  key={theme.id}
                  href={`/themes/${theme.id}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/35 p-5 transition-all hover:border-primary/30 hover:bg-card/65 hover:shadow-soft"
                >
                  <div
                    className="relative flex h-28 items-end gap-2 overflow-hidden rounded-xl border border-border/50 px-3 py-3"
                    style={{
                      background: backgroundImage
                        ? `center / cover no-repeat url("${backgroundImage}")`
                        : background,
                    }}
                  >
                    <div
                      className="absolute inset-0"
                      style={{ background, opacity: 0.82 }}
                    />
                    <span
                      className="relative max-w-[70%] rounded-xl px-2.5 py-1.5 text-[10px] leading-relaxed"
                      style={{
                        background: secondary,
                        color: foreground,
                        border: `1px solid ${primary}33`,
                      }}
                    >
                      港口的雾又浓了。
                    </span>
                    <span
                      className="relative ml-auto max-w-[62%] rounded-xl px-2.5 py-1.5 text-[10px] leading-relaxed"
                      style={{
                        background: `${primary}1f`,
                        color: foreground,
                        border: `1px solid ${primary}33`,
                      }}
                    >
                      炉火正好。
                    </span>
                  </div>

                  <div className="relative mt-3 flex flex-wrap items-center gap-2">
                    <h2 className="truncate font-display text-lg font-medium">
                      {theme.name}
                    </h2>
                    {theme.isDefault && (
                      <Badge
                        variant="secondary"
                        className="rounded-full px-2 py-0 text-[10px]"
                      >
                        默认
                      </Badge>
                    )}
                    <span className="ml-auto flex items-center gap-1">
                      {[background, foreground, primary, secondary, accent].map(
                        (color, index) => (
                          <span
                            key={`${theme.id}-${index}`}
                            className="size-3.5 rounded-full border border-border/60"
                            style={{ background: color }}
                          />
                        ),
                      )}
                    </span>
                  </div>

                  <p className="relative mt-1 line-clamp-2 min-h-8 text-xs leading-relaxed text-muted-foreground">
                    {theme.description || "自定义聊天主题"}
                  </p>

                  <div className="relative mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                    <span>
                      {MODE_LABEL[theme.mode] ?? "通用"} · 更新于{" "}
                      {formatRelativeTime(theme.updatedAt)}
                    </span>
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
