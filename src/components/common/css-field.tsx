"use client";

import { useMemo } from "react";
import { Wand2, X } from "lucide-react";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { sanitizeCustomCss } from "@/lib/css/sanitize";
import { cn } from "@/lib/utils";

const DROP_CAP_EXAMPLE = `.zy-content .chat-prose > p:first-of-type::first-letter {
  float: left;
  font-size: 3.4em;
  line-height: 1;
  margin: 0.08em 0.1em 0 0;
  color: #7ec8e3;
  font-weight: 600;
}

/* 让浮动首字不会影响后续段落 */
.zy-content {
  display: flow-root;
}`;

export function CssField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const status = useMemo(() => {
    if (!value.trim()) return { error: null as string | null, rules: 0 };
    try {
      const css = sanitizeCustomCss(value);
      return {
        error: null as string | null,
        rules: (css.match(/\{/g) ?? []).length,
      };
    } catch (error) {
      return {
        error:
          error instanceof Error ? error.message : "CSS 解析失败",
        rules: 0,
      };
    }
  }, [value]);

  const selectorWarning = /\.zy-bubble\s+\.zy-content|\.zy-content\s+\.zy-bubble/.test(
    value,
  )
    ? ".zy-bubble 和 .zy-content 在同一个元素上，请写成 .zy-bubble.zy-content（不要用空格）。"
    : /\.zy-content\s*::first-letter/.test(value)
      ? "首字下沉需要作用到段落：.zy-content .chat-prose > p:first-of-type::first-letter"
      : null;

  function insertExample() {
    onChange(
      value.trim()
        ? `${value.trimEnd()}\n\n${DROP_CAP_EXAMPLE}`
        : DROP_CAP_EXAMPLE,
    );
  }

  return (
    <Field label="CSS" hint="可选">
      <Textarea
        value={value}
        rows={8}
        maxLength={50_000}
        spellCheck={false}
        className="font-mono text-[13px] leading-relaxed"
        placeholder={`.zy-content p:first-of-type::first-letter {\n  color: #7ec8e3;\n}`}
        onChange={(event) => onChange(event.target.value)}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 rounded-lg text-[11px]"
            onClick={insertExample}
          >
            <Wand2 data-icon="inline-start" />
            插入首字下沉示例
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg text-[11px] text-muted-foreground"
              onClick={() => onChange("")}
            >
              <X data-icon="inline-start" />
              清空
            </Button>
          )}
        </div>
        <span
          className={cn(
            "text-[11px]",
            status.error || selectorWarning
              ? "text-amber-500"
              : "text-muted-foreground",
          )}
        >
          {status.error
            ? `CSS 未完成，预览会尽量补全：${status.error}`
            : value.trim()
              ? selectorWarning || `已实时应用 ${status.rules} 条规则`
              : ""}
        </span>
      </div>
      <div className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <p>
          选择器会自动限定在 <code>.zy-chat</code> 内。可写{" "}
          <code>.zy-bubble</code>、<code>.zy-content</code>、
          <code>.zy-name</code>、<code>.zy-avatar</code>、
          <code>.zy-aid-status</code>、<code>.zy-aid-goal</code>、
          <code>.zy-aid-option</code>。
        </p>
        <p>
          <code>.zy-bubble</code> 和 <code>.zy-content</code> 在同一个元素上；
          要同时限定请写 <code>.zy-bubble.zy-content</code>，而不是空格。
          首字下沉需要作用到段落：{" "}
          <code>.zy-content .chat-prose &gt; p:first-of-type::first-letter</code>。
        </p>
        <p>
          包含 <code>@import</code>、<code>url()</code> 或脚本的规则会被移除；
          输入过程中的半成品规则不会冲掉预览里上一次有效的结果。
        </p>
      </div>
    </Field>
  );
}
