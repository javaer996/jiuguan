import { cn } from "@/lib/utils";

export function TavernMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      className={cn("size-9", className)}
    >
      <defs>
        <linearGradient id="tavern-gold" x1="6" y1="4" x2="42" y2="44">
          <stop offset="0%" stopColor="#f6d79a" />
          <stop offset="45%" stopColor="#e0a45e" />
          <stop offset="100%" stopColor="#a8434f" />
        </linearGradient>
      </defs>
      <rect
        x="1.5"
        y="1.5"
        width="45"
        height="45"
        rx="14"
        fill="url(#tavern-gold)"
        fillOpacity="0.1"
        stroke="url(#tavern-gold)"
        strokeWidth="1.4"
      />
      <path
        d="M14 12.5h20l-2.4 11.2a7.7 7.7 0 0 1-15.2 0L14 12.5Z"
        fill="none"
        stroke="url(#tavern-gold)"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M24 31.5v6.2M18.6 38.4h10.8"
        fill="none"
        stroke="url(#tavern-gold)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="24" cy="20" r="2.1" fill="url(#tavern-gold)" />
      <path
        d="M19.2 9.5c.6-1.4.6-2.6 0-3.8M24 9.5c.6-1.4.6-2.6 0-3.8M28.8 9.5c.6-1.4.6-2.6 0-3.8"
        fill="none"
        stroke="url(#tavern-gold)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export function BrandLockup({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <TavernMark />
      <span className="flex flex-col leading-none">
        <span className="font-display text-xl font-semibold tracking-wide text-gradient-gold">
          醉语
        </span>
        {!compact && (
          <span className="mt-1 text-[10px] tracking-[0.32em] text-muted-foreground uppercase">
            Tavern
          </span>
        )}
      </span>
    </span>
  );
}
