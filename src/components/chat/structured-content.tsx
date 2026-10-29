"use client";

import type { OutputSchemaSnapshot } from "@/db/schema/types";
import { Markdown } from "@/components/chat/markdown";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type UiHint = { component?: string; order?: number; label?: string };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function valueText(value: unknown) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value, null, 2);
}

function StructuredValue({
  value,
  component,
}: {
  value: unknown;
  component?: string;
}) {
  if (component === "markdown" && typeof value === "string") {
    return <Markdown content={value} />;
  }

  if (component === "quote") {
    return (
      <blockquote className="border-l-2 border-primary/45 pl-3 text-[1.02em] leading-relaxed italic">
        {valueText(value)}
      </blockquote>
    );
  }

  if (component === "badge") {
    const items = Array.isArray(value) ? value : [value];
    return (
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, index) => (
          <Badge
            key={index}
            variant="outline"
            className="border-primary/30 bg-primary/[0.06] px-2 py-0.5 text-[11px] font-normal text-primary"
          >
            {valueText(item)}
          </Badge>
        ))}
      </div>
    );
  }

  if (component === "list") {
    const items = Array.isArray(value) ? value : [value];
    return (
      <ul className="list-disc space-y-1 pl-5">
        {items.map((item, index) => (
          <li key={index}>{valueText(item)}</li>
        ))}
      </ul>
    );
  }

  if (typeof value === "string") {
    return (
      <p className="whitespace-pre-wrap leading-relaxed">
        {value}
      </p>
    );
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <span>{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((item, index) => (
          <Badge key={index} variant="secondary" className="font-normal">
            {valueText(item)}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <pre className="overflow-x-auto rounded-lg bg-secondary/40 p-2.5 font-mono text-[11px] leading-relaxed">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function StructuredContent({
  structured,
  schema,
  className,
}: {
  structured: unknown;
  schema: OutputSchemaSnapshot | null;
  className?: string;
}) {
  if (structured == null) return null;

  if (!isPlainObject(structured)) {
    return (
      <div className={className}>
        <StructuredValue value={structured} />
      </div>
    );
  }

  const properties = isPlainObject(schema?.schema?.properties)
    ? (schema!.schema.properties as Record<string, Record<string, unknown>>)
    : {};

  const entries = Object.entries(structured)
    .filter(([, value]) => value !== undefined)
    .map(([key, value], index) => {
      const meta = properties[key];
      const hint =
        meta && isPlainObject(meta["x-ui"])
          ? (meta["x-ui"] as UiHint)
          : undefined;
      return {
        key,
        value,
        meta,
        hint,
        order: hint?.order ?? 1000 + index,
      };
    })
    .sort((a, b) => a.order - b.order);

  if (entries.length === 0) {
    return (
      <pre className="overflow-x-auto font-mono text-xs">
        {JSON.stringify(structured, null, 2)}
      </pre>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {entries.map(({ key, value, meta, hint }) => {
        const title =
          hint?.label ||
          (typeof meta?.title === "string" ? meta.title : key);
        const showLabel = title !== key || entries.length > 1;
        const component =
          hint?.component ??
          (typeof meta?.["x-ui"] === "string"
            ? (meta["x-ui"] as string)
            : undefined);

        return (
          <div key={key} className="space-y-1">
            {showLabel && (
              <p className="text-[10px] font-medium tracking-[0.12em] text-muted-foreground/70 uppercase">
                {title}
              </p>
            )}
            <StructuredValue value={value} component={component} />
          </div>
        );
      })}
    </div>
  );
}
