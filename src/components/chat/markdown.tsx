"use client";

import ReactMarkdown from "react-markdown";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import remarkGfm from "remark-gfm";
import type { Root } from "mdast";
import { cn } from "@/lib/utils";

/** 只额外放行旁白标记所需的 class，其余仍走 rehype-sanitize 默认白名单。 */
const SANITIZE_SCHEMA = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      ["className", "zy-narration"],
    ],
  },
};

/**
 * 轻量 mdast 节点类型。这里只关心文本、子节点与 to-hast 的覆盖字段，
 * 避免为一个小的旁白标记引入额外依赖。
 */
type WalkNode = {
  type: string;
  value?: string;
  children?: WalkNode[];
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
};

const QUOTE_SPLIT = /(「[^」\n]+」|“[^”\n]+”|『[^』\n]+』|"[^"\n]+")/g;

const QUOTE_PAIRS: [string, string][] = [
  ["「", "」"],
  ["“", "”"],
  ["『", "』"],
  ['"', '"'],
];

function isQuoted(value: string) {
  return QUOTE_PAIRS.some(
    ([open, close]) => value.startsWith(open) && value.endsWith(close),
  );
}

function splitText(value: string): WalkNode[] {
  const nodes: WalkNode[] = [];
  for (const part of value.split(QUOTE_SPLIT)) {
    if (!part) continue;
    if (isQuoted(part)) {
      nodes.push({
        type: "emphasis",
        data: {
          hName: "span",
          hProperties: { className: ["zy-narration"] },
        },
        children: [{ type: "text", value: part }],
      });
    } else {
      nodes.push({ type: "text", value: part });
    }
  }
  return nodes;
}

function transformQuotes(node: WalkNode) {
  if (!node.children) return;
  const next: WalkNode[] = [];
  for (const child of node.children) {
    if (child.type === "text" && typeof child.value === "string") {
      next.push(...splitText(child.value));
      continue;
    }
    // 代码块和行内代码里的引号保持原样
    if (
      child.type !== "code" &&
      child.type !== "inlineCode" &&
      child.type !== "html"
    ) {
      transformQuotes(child);
    }
    next.push(child);
  }
  node.children = next;
}

function remarkNarrationQuotes() {
  return (tree: Root) => {
    transformQuotes(tree as unknown as WalkNode);
  };
}

export function Markdown({
  content,
  className,
  narrationQuotes,
  narrationColor,
}: {
  content: string;
  className?: string;
  narrationQuotes?: boolean;
  narrationColor?: string;
}) {
  return (
    <div className={cn("chat-prose", className)}>
      <ReactMarkdown
        remarkPlugins={narrationQuotes ? [remarkGfm, remarkNarrationQuotes] : [remarkGfm]}
        rehypePlugins={[[rehypeSanitize, SANITIZE_SCHEMA]]}
        components={{
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              className="text-primary underline underline-offset-4"
              {...props}
            >
              {children}
            </a>
          ),
          p: ({ children }) => <p>{children}</p>,
          span: ({
            node: _node,
            className: spanClassName,
            children,
            ...props
          }) => {
            void _node;
            const isNarration = spanClassName
              ?.split(/\s+/)
              .includes("zy-narration");
            return (
              <span
                className={spanClassName}
                style={isNarration ? { color: narrationColor || undefined } : undefined}
                {...props}
              >
                {children}
              </span>
            );
          },
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 border-l-2 border-primary/40 pl-3 text-muted-foreground italic">
              {children}
            </blockquote>
          ),
          code: ({ children, className: codeClassName }) => {
            const inline = !codeClassName;
            return inline ? (
              <code className="rounded bg-secondary/70 px-1 py-0.5 font-mono text-[0.9em]">
                {children}
              </code>
            ) : (
              <code className={cn("font-mono text-[0.85em]", codeClassName)}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-xl bg-secondary/50 p-3 text-[0.85em] leading-relaxed">
              {children}
            </pre>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
