import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-dashed border-border/80 bg-card/25 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="pointer-events-none absolute -top-20 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[80px]" />
      <span className="relative flex size-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-glow">
        <Icon className="size-7" />
      </span>
      <h2 className="relative mt-5 font-display text-xl font-medium">
        {title}
      </h2>
      <p className="relative mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action && <div className="relative mt-6">{action}</div>}
    </div>
  );
}
