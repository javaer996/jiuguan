"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchInput({
  placeholder = "搜索…",
  className,
}: {
  placeholder?: string;
  className?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [value, setValue] = useState(searchParams.get("q") ?? "");
  const lastPushed = useRef<string | null>(searchParams.get("q") ?? "");

  useEffect(() => {
    const timer = setTimeout(() => {
      const query = value.trim();
      if (lastPushed.current === query) return;
      lastPushed.current = query;

      const params = new URLSearchParams(window.location.search);
      if (query) params.set("q", query);
      else params.delete("q");

      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }, 350);

    return () => clearTimeout(timer);
  }, [value, pathname, router]);

  return (
    <div className={cn("relative w-full sm:w-64", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-xl bg-background/50 pr-8 pl-8 text-sm"
      />
      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
          className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="清空搜索"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
