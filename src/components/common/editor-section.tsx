import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EditorSection({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-card/30 p-5 sm:p-6",
        className,
      )}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-medium">{title}</h2>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}
