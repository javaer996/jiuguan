"use client";

import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function TagInput({
  value,
  onChange,
  placeholder = "输入后按回车添加标签",
  max = 20,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState("");

  function commit() {
    const tag = draft.trim().replace(/^#/, "");
    if (!tag) return;
    if (value.length >= max) return;
    if (!value.includes(tag)) onChange([...value, tag]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commit();
      return;
    }
    if (event.key === "Backspace" && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-xl border border-input bg-background/50 px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/30">
      {value.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="gap-1 rounded-md py-0.5 pr-1 pl-2 text-[11px] font-normal"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(value.filter((item) => item !== tag))}
            className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-background/60 hover:text-foreground"
            aria-label={`移除标签 ${tag}`}
          >
            <X className="size-2.5" />
          </button>
        </Badge>
      ))}
      <Input
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commit}
        placeholder={value.length === 0 ? placeholder : ""}
        maxLength={32}
        className="h-6 min-w-24 flex-1 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
      />
    </div>
  );
}
