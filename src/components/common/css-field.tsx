"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, Sparkles, Undo2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { Field } from "@/components/common/field";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const STEEL_BORDER_EXAMPLE = `/* 钢铁边框：金属渐变 ring + 四角铆钉 */
.zy-bubble.zy-content::before {
  content: "";
  position: absolute;
  inset: -2px;
  padding: 2px;
  border-radius: inherit;
  background: linear-gradient(135deg, #f8fafc, #64748b 30%, #e2e8f0 50%, #334155 75%, #cbd5e1);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

.zy-bubble.zy-content::after {
  content: "";
  position: absolute;
  inset: -6px;
  border-radius: inherit;
  background:
    radial-gradient(circle at 10px 10px, #cbd5e1 0 2px, transparent 2.5px),
    radial-gradient(circle at calc(100% - 10px) 10px, #cbd5e1 0 2px, transparent 2.5px),
    radial-gradient(circle at 10px calc(100% - 10px), #cbd5e1 0 2px, transparent 2.5px),
    radial-gradient(circle at calc(100% - 10px) calc(100% - 10px), #cbd5e1 0 2px, transparent 2.5px);
  pointer-events: none;
}`;

const RABBIT_EARS_EXAMPLE = `/* 兔耳边框：绝对定位的两只耳朵，背景跟随气泡 */
.zy-bubble.zy-content::before,
.zy-bubble.zy-content::after {
  content: "";
  position: absolute;
  top: -18px;
  width: 16px;
  height: 28px;
  background: inherit;
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-bottom: 0;
  border-radius: 60% 60% 40% 40% / 70% 70% 30% 30%;
  pointer-events: none;
}

.zy-bubble.zy-content::before {
  left: 18%;
  transform: rotate(-14deg);
}

.zy-bubble.zy-content::after {
  left: 36%;
  transform: rotate(10deg);
}`;

const STAMP_BORDER_EXAMPLE = `/* 邮票齿孔：用 mask 在气泡边缘打孔 */
.zy-bubble.zy-content {
  -webkit-mask:
    radial-gradient(circle at 4px 4px, transparent 3px, #000 3.5px) 0 0 / 12px 12px,
    linear-gradient(#000 0 0);
  mask:
    radial-gradient(circle at 4px 4px, transparent 3px, #000 3.5px) 0 0 / 12px 12px,
    linear-gradient(#000 0 0);
}`;

const CSS_EXAMPLES = [
  { key: "dropcap", label: "首字下沉", snippet: DROP_CAP_EXAMPLE },
  { key: "steel", label: "钢铁边框", snippet: STEEL_BORDER_EXAMPLE },
  { key: "ears", label: "兔耳边框", snippet: RABBIT_EARS_EXAMPLE },
  { key: "stamp", label: "邮票齿孔", snippet: STAMP_BORDER_EXAMPLE },
] as const;

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

  const sanitizerWarning = /position\s*:\s*(?:fixed|sticky)/i.test(value)
    ? "position 只允许 relative / absolute / static，fixed / sticky 会被清洗。"
    : /(?:border-image|mask)[^;{}]*url\s*\(/i.test(value)
      ? "border-image / mask 只能使用渐变，url() 会被清洗。"
      : null;

  function insertSnippet(snippet: string) {
    if (generating) return;
    onChange(value.trim() ? `${value.trimEnd()}\n\n${snippet}` : snippet);
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
      : "描述想要的效果，例如：钢铁边框四角有铆钉、气泡顶部两只兔耳、邮票齿孔边";

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-lg text-[11px]"
                disabled={generating}
              >
                <Wand2 data-icon="inline-start" />
                插入示例
                <ChevronDown data-icon="inline-end" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              {CSS_EXAMPLES.map((example) => (
                <DropdownMenuItem
                  key={example.key}
                  onSelect={() => insertSnippet(example.snippet)}
                >
                  {example.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
            status.error || selectorWarning || sanitizerWarning
              ? "text-amber-500"
              : "text-muted-foreground",
          )}
        >
          {status.error
            ? `CSS 未完成，预览会尽量补全：${status.error}`
            : value.trim()
              ? sanitizerWarning ||
                selectorWarning ||
                `已实时应用 ${status.rules} 条规则`
              : ""}
        </span>
      </div>
      <div className="space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
        <p>
          选择器会自动限定在 <code>.zy-chat</code> 内。可写{" "}
          <code>.zy-bubble</code>、<code>.zy-content</code>、
          <code>.zy-message-user</code>、<code>.zy-message-assistant</code>、
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
          <code>@keyframes</code> 动画；支持 <code>position: absolute</code>、
          <code>inset</code>、<code>z-index</code>、<code>border-image</code>、{" "}
          <code>mask</code> 等装饰属性，可以做兔耳、钢铁描边、邮票齿孔等异形边框。
          <code>position</code> 只允许 relative / absolute / static（禁止 fixed /
          sticky）；<code>border-image</code> 与 <code>mask</code> 只能使用渐变。
          背景图仅允许 <code>/uploads/...</code> 或 http(s) 地址。包含{" "}
          <code>@import</code>、脚本或不允许协议的 URL
          会被移除；输入过程中的半成品规则不会冲掉预览里上一次有效的结果。
          <br />
          装饰伪元素建议加 <code>pointer-events: none</code>
          ，避免遮挡文字选择与点击；修改背景色时请同时设置 <code>color</code>
          ：预览使用当前界面文字色，聊天页使用主题文字色，不写容易在某一侧看不清。
        </p>
      </div>
    </Field>
  );
}
