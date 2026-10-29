"use client";

import { sanitizeCustomCssSafe } from "@/lib/css/sanitize";
import {
  sanitizeThemeBackgroundUrlSafe,
  sanitizeThemeTokensSafe,
  themeTokensToStyle,
} from "@/lib/theme/tokens";
import { cn } from "@/lib/utils";

export function ThemePreview({
  tokens,
  backgroundUrl,
  customCss,
  className,
  title = "雾港夜航",
  subtitle = "月见 · 暖金酒馆",
}: {
  tokens?: Record<string, string> | null;
  backgroundUrl?: string | null;
  customCss?: string | null;
  className?: string;
  title?: string;
  subtitle?: string;
}) {
  const safeTokens = sanitizeThemeTokensSafe(tokens);
  const safeBackground = sanitizeThemeBackgroundUrlSafe(backgroundUrl);
  const sanitizedCss = sanitizeCustomCssSafe(customCss);

  return (
    <div
      className={cn(
        "zy-chat relative isolate overflow-hidden rounded-2xl border border-border/60 bg-background text-foreground shadow-soft",
        className,
      )}
      style={themeTokensToStyle(safeTokens)}
    >
      {sanitizedCss && <style>{sanitizedCss}</style>}

      {safeBackground && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-cover bg-center"
          style={{ backgroundImage: `url("${safeBackground}")` }}
        />
      )}
      {safeBackground && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-background/85 backdrop-blur-sm"
        />
      )}

      <header className="flex items-center justify-between gap-3 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-card/90 font-display text-[11px] text-primary ring-1 ring-border/50 backdrop-blur-sm">
            月
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-medium">{title}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {subtitle}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
          主题预览
        </span>
      </header>

      <div className="space-y-3.5 px-4 py-4">
        <div className="flex items-end gap-2">
          <span className="zy-avatar flex size-7 shrink-0 items-center justify-center rounded-xl bg-card/90 font-display text-[10px] text-primary ring-1 ring-border/50 backdrop-blur-sm">
            月
          </span>
          <div className="zy-bubble max-w-[82%] rounded-2xl border border-primary/25 bg-card/80 px-3.5 py-2 text-[13px] leading-relaxed backdrop-blur-sm">
            港口的雾又浓了。你来得正好，炉火刚添过一轮炭。
          </div>
        </div>

        <div className="flex flex-row-reverse items-end gap-2">
          <span className="zy-avatar flex size-7 shrink-0 items-center justify-center rounded-xl bg-secondary/90 font-display text-[10px] text-muted-foreground ring-1 ring-border/50 backdrop-blur-sm">
            你
          </span>
          <div className="zy-bubble max-w-[82%] rounded-2xl border border-primary/20 bg-primary/[0.08] px-3.5 py-2 text-[13px] leading-relaxed">
            我在找一个人。有人说，他最后一次出现，是在这间酒馆。
          </div>
        </div>

        <div className="flex items-end gap-2">
          <span className="zy-avatar flex size-7 shrink-0 items-center justify-center rounded-xl bg-card/90 font-display text-[10px] text-primary ring-1 ring-border/50 backdrop-blur-sm">
            月
          </span>
          <div className="zy-bubble max-w-[82%] rounded-2xl border border-primary/25 bg-card/80 px-3.5 py-2 text-[13px] leading-relaxed backdrop-blur-sm">
            那要看，你愿意拿什么来换这个消息了。
          </div>
        </div>
      </div>

      <div className="border-t border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="flex-1 rounded-xl border border-border/70 bg-card/85 px-3 py-2 text-[11px] text-muted-foreground/60">
            对月见说点什么…
          </span>
          <span className="flex size-8 items-center justify-center rounded-xl bg-primary text-[11px] font-medium text-primary-foreground">
            发送
          </span>
        </div>
      </div>
    </div>
  );
}
