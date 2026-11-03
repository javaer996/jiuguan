"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, Sparkles, Undo2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiClientError, apiFetch } from "@/lib/client/api";
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
  target = "style",
  context,
}: {
  value: string;
  onChange: (value: string) => void;
  target?: "style" | "theme";
  context?: string;
}) {
  const [idea, setIdea] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<{
    code: string;
    message: string;
  } | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

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
    if (generating) return;
    onChange(
      value.trim()
        ? `${value.trimEnd()}\n\n${DROP_CAP_EXAMPLE}`
        : DROP_CAP_EXAMPLE,
    );
  }

  async function generate() {
    if (generating) return;
    const description = idea.trim();
    if (description.length < 2) {
      toast.error("先描述一下想要的效果");
      return;
    }

    const baseCss = value;
    const controller = new AbortController();
    abortRef.current = controller;
    setGenerating(true);
    setError(null);
    try {
      const data = await apiFetch<{ css: string; model: string }>(
        "/api/ai/css",
        {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            target,
            idea: description,
            currentCss: baseCss,
            context,
          }),
        },
      );

      if (data.css === baseCss) {
        toast.info("生成结果与当前 CSS 相同");
        return;
      }

      setSnapshot(baseCss);
      onChange(data.css);
      toast.success(`已生成 CSS（${data.model}），右侧预览已更新`);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof ApiClientError ? err.message : "生成失败，请稍后再试";
      setError({
        code: err instanceof ApiClientError ? err.code : "UNKNOWN",
        message,
      });
      toast.error(message);
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setGenerating(false);
    }
  }

  function undo() {
    if (snapshot === null) return;
    onChange(snapshot);
    setSnapshot(null);
    setError(null);
    toast.success("已恢复生成前的内容");
  }

  const aiPlaceholder =
    target === "theme"
      ? "描述聊天区域的效果，例如：冷雾青绿，气泡边缘有微光"
      : "描述想要的效果，例如：角色气泡改成夜间信笺，圆角更小、文字更紧凑";

  return (
    <Field label="CSS" hint="可选">
      <div className="rounded-xl border border-primary/25 bg-primary/[0.04] p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-xs font-medium">
            <Sparkles className="size-3.5 text-primary" />
            AI 生成 CSS
          </p>
          {snapshot !== null && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 rounded-lg px-2 text-[11px] text-muted-foreground"
              disabled={generating}
              onClick={undo}
            >
              <Undo2 data-icon="inline-start" />
              撤销 AI 生成
            </Button>
          )}
        </div>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input
            value={idea}
            maxLength={800}
            placeholder={aiPlaceholder}
            aria-label="描述想要生成的 CSS 效果"
            className="h-8 text-xs"
            disabled={generating}
            onChange={(event) => setIdea(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                void generate();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="h-8 shrink-0 rounded-lg"
            disabled={generating || idea.trim().length < 2}
            onClick={() => void generate()}
          >
            {generating ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Sparkles data-icon="inline-start" />
            )}
            {generating ? "生成中…" : "生成"}
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          AI 会基于当前 CSS 修改，并立即更新右侧预览。支持 @media、@keyframes 动画和背景图 URL；不支持 @import、var() 与定位叠层。生成结果仍需点击保存。
        </p>
        {error && (
          <p
            role="alert"
            className="mt-1.5 text-[11px] leading-relaxed text-destructive"
          >
            {error.message}
            {error.code === "NO_PROVIDER" && (
              <Link
                href="/settings"
                className="ml-1 underline underline-offset-2"
              >
                去设置接入
              </Link>
            )}
          </p>
        )}
      </div>

      <Textarea
        value={value}
        rows={8}
        maxLength={50_000}
        spellCheck={false}
        disabled={generating}
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
            disabled={generating}
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
              disabled={generating}
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
          支持 <code>@media</code>、<code>@supports</code> 与{" "}
          <code>@keyframes</code> 动画；背景图仅允许 <code>/uploads/...</code>{" "}
          或 http(s) 地址。包含 <code>@import</code>、脚本或不允许协议的 URL
          会被移除；输入过程中的半成品规则不会冲掉预览里上一次有效的结果。
          <br />
          不支持 <code>position</code>，伪元素默认是行内元素：依赖伪元素宽高或位移的动画不会显示，
          动效请作用在 <code>.zy-bubble</code> 或 <code>.zy-content</code> 本身。
          修改背景色时请同时设置 <code>color</code>：预览使用当前界面文字色，
          聊天页使用主题文字色，不写容易在某一侧看不清。
        </p>
      </div>
    </Field>
  );
}
