import Link from "next/link";
import { Heart, Sparkles, Star, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { PlazaTemplateCardDTO } from "@/lib/types/plaza";
import { cn, formatNumber, initials } from "@/lib/utils";

export function PlazaCard({
  template,
  className,
}: {
  template: PlazaTemplateCardDTO;
  className?: string;
}) {
  return (
    <Link
      href={`/plaza/${template.id}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/40 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:bg-card/70 hover:shadow-soft",
        className,
      )}
    >
      <div className="relative h-40 overflow-hidden">
        {template.coverUrl ? (
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-[1.03]"
            style={{ backgroundImage: `url("${template.coverUrl}")` }}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,color-mix(in_oklch,var(--primary)_30%,transparent),transparent_60%),radial-gradient(circle_at_80%_80%,color-mix(in_oklch,var(--chart-4)_18%,transparent),transparent_55%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
          {template.featured && (
            <Badge className="rounded-full bg-primary/90 text-primary-foreground backdrop-blur">
              <Sparkles className="size-3" />
              推荐
            </Badge>
          )}
          {template.isOfficial && (
            <Badge
              variant="secondary"
              className="rounded-full bg-background/70 backdrop-blur"
            >
              官方
            </Badge>
          )}
          {template.category && (
            <Badge
              variant="outline"
              className="rounded-full border-white/20 bg-background/55 text-foreground backdrop-blur"
            >
              {template.category.name}
            </Badge>
          )}
        </div>

        {!template.coverUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-5xl text-primary/35">
              {initials(template.title)}
            </span>
          </div>
        )}
      </div>

      <div className="relative flex flex-1 flex-col p-5 pt-2">
        <h3 className="font-display text-lg font-medium tracking-tight transition-colors group-hover:text-primary">
          {template.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 min-h-10 text-xs leading-relaxed text-muted-foreground">
          {template.summary || "作者还没有留下简介。"}
        </p>

        {template.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-secondary/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 border-t border-border/50 pt-3">
          <Avatar className="size-6 rounded-full">
            {template.author.avatarUrl && (
              <AvatarImage src={template.author.avatarUrl} alt="" />
            )}
            <AvatarFallback className="rounded-full bg-primary/10 text-[10px] text-primary">
              {initials(template.author.displayName)}
            </AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
            {template.author.displayName}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Users className="size-3" />
            {formatNumber(template.cloneCount)}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Heart className="size-3" />
            {formatNumber(template.likeCount)}
          </span>
          {template.ratingCount > 0 && (
            <span className="flex items-center gap-1 text-[11px] text-primary">
              <Star className="size-3 fill-current" />
              {template.ratingAvg.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
