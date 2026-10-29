"use client";

import { useState } from "react";
import { Check, Copy, FileJson, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DEFAULT_OUTPUT_SCHEMA } from "@/lib/content/defaults";
import { cn } from "@/lib/utils";

const SAMPLE_RESPONSE = {
  narration:
    "雨声顺着旧书店的玻璃滑下来，像有人在窗外一页一页地翻书。",
  speech: "你终于来了。茶刚温好，坐吧。",
  mood: "温柔",
  items: ["旧钥匙", "半张船票"],
};

const COMPONENTS = [
  {
    key: "markdown",
    label: "Markdown 正文",
    description: "适合旁白、环境与心理描写，支持标题、列表、引用与代码块。",
  },
  {
    key: "quote",
    label: "对白引用",
    description: "把角色说出口的话渲染成醒目的引用块，与旁白区分。",
  },
  {
    key: "badge",
    label: "状态徽章",
    description: "适合情绪、地点、时间等短文本；配合 enum 限定取值范围。",
  },
  {
    key: "list",
    label: "列表 / 物品栏",
    description: "适合道具、线索、同行者等数组字段，逐项渲染。",
  },
];

const MARKDOWN_DOC = `# 醉语输出格式 Schema 指南

## 基本结构

输出格式是一份 JSON Schema 2020-12，顶层必须是 object：

\`\`\`json
${JSON.stringify(DEFAULT_OUTPUT_SCHEMA, null, 2)}
\`\`\`

## x-ui 渲染指令

在每个属性上添加 \`x-ui\`：

| 组件 | 说明 |
| --- | --- |
| markdown | 正文 / 旁白，支持 Markdown |
| quote | 对白引用 |
| badge | 短文本徽章 |
| list | 数组列表 / 物品栏 |

\`x-ui.order\` 控制渲染顺序，数字越小越靠前。

## 模式

- \`json_object\`：只要求返回合法 JSON，兼容性最好。
- \`json_schema\`：供应商支持时启用严格约束，建议同时打开 strict。
- \`text\`：不使用结构化输出，按普通 Markdown 渲染。

## 校验

聊天生成后会用 ajv 校验返回内容。校验失败时，原始文本仍会保留，
并在消息元数据里记录错误，方便调整 Schema 或提示词。

## 示例返回

\`\`\`json
${JSON.stringify(SAMPLE_RESPONSE, null, 2)}
\`\`\`
`;

function CopyBlock({
  title,
  description,
  value,
  className,
}: {
  title: string;
  description?: string;
  value: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("已复制到剪贴板");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("复制失败，请手动选择文本");
    }
  }

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/60 bg-card/30",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 px-4 py-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-medium">
            <FileJson className="size-4 text-primary" />
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void copy()}
          className="rounded-lg"
        >
          {copied ? (
            <Check data-icon="inline-start" />
          ) : (
            <Copy data-icon="inline-start" />
          )}
          {copied ? "已复制" : "复制"}
        </Button>
      </div>
      <pre className="max-h-[520px] overflow-auto bg-background/40 p-4 text-[11px] leading-relaxed text-foreground/80">
        <code>{value}</code>
      </pre>
    </section>
  );
}

export function SchemaDocs() {
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium">
            <Sparkles className="size-4 text-primary" />
            让 AI 的回复有形状
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            用 JSON Schema 描述 AI 应该返回什么，再用{" "}
            <code className="rounded bg-background/60 px-1 py-0.5 text-xs">
              x-ui
            </code>{" "}
            指定每个字段如何渲染。聊天界面会校验返回内容，并把旁白、对白、情绪与物品分别放进对应的位置。
          </p>
        </section>

        <CopyBlock
          title="示例 Schema"
          description="一份可直接使用的叙事回复格式，包含旁白、对白、情绪与物品栏。"
          value={JSON.stringify(DEFAULT_OUTPUT_SCHEMA, null, 2)}
        />

        <CopyBlock
          title="示例返回"
          description="AI 按上面的 Schema 返回的 JSON 示例。"
          value={JSON.stringify(SAMPLE_RESPONSE, null, 2)}
        />

        <CopyBlock
          title="完整文档（Markdown）"
          description="可以复制到自己的笔记里，或贴给 AI 作为格式说明。"
          value={MARKDOWN_DOC}
        />
      </div>

      <aside className="space-y-4">
        <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
          <h2 className="font-display text-base font-medium">渲染组件</h2>
          <div className="mt-3 space-y-3">
            {COMPONENTS.map((component) => (
              <div key={component.key}>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="rounded-full font-mono">
                    {component.key}
                  </Badge>
                  <span className="text-xs font-medium">{component.label}</span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  {component.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border/60 bg-card/30 p-5">
          <h2 className="font-display text-base font-medium">三条建议</h2>
          <ul className="mt-3 space-y-2 text-[11px] leading-relaxed text-muted-foreground">
            <li>· 顶层保持 object，并把关键字段写进 required。</li>
            <li>· 设置 additionalProperties: false，减少模型自由发挥。</li>
            <li>· 字段不要太多；先让核心叙事跑通，再逐步加结构。</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
