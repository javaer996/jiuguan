"use client";

import type { ReactNode } from "react";
import { StylePreview } from "@/components/styles/style-editor";
import { ThemePreview } from "@/components/themes/theme-preview";
import { Badge } from "@/components/ui/badge";
import type {
  AiDraft,
  CharacterDraft,
  PromptDraft,
  StyleDraft,
  ThemeDraft,
  WorldbookDraft,
} from "@/lib/ai/drafts";
import type { AiKind } from "@/lib/ai/kinds";
import { applyChatVariables } from "@/lib/chat/variables";

export function StudioDraftPreview({
  kind,
  draft,
  styleConfig,
  userName,
}: {
  kind: AiKind;
  draft: AiDraft;
  /** 主题预览时使用同一套生成结果中的对话样式。 */
  styleConfig?: StyleDraft["config"] | null;
  /** 角色卡与世界书预览中替换 {{user}} 的名称。 */
  userName?: string;
}) {
  const resolvedUserName = userName?.trim() || "你";
  const resolve = (text: string, charName: string) =>
    applyChatVariables(text, { char: charName, user: resolvedUserName });
  if (kind === "character") {
    const data = draft as CharacterDraft;
    return (
      <div className="space-y-5">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-2xl font-semibold">{data.name}</h2>
            {data.tags?.map((tag) => (
              <Badge key={tag} variant="secondary" className="rounded-full">
                {tag}
              </Badge>
            ))}
          </div>
          {data.tagline && (
            <p className="mt-1.5 text-sm text-primary/80">
              {resolve(data.tagline, data.name)}
            </p>
          )}
        </div>
        <PreviewSection title="角色描述">
          {resolve(data.description, data.name)}
        </PreviewSection>
        <PreviewSection title="性格">
          {resolve(data.personality, data.name)}
        </PreviewSection>
        <PreviewSection title="场景">
          {resolve(data.scenario, data.name)}
        </PreviewSection>
        <PreviewSection title="开场白">
          <span className="italic">
            {resolve(data.firstMessage, data.name)}
          </span>
        </PreviewSection>
        {data.exampleDialogue && (
          <PreviewSection title="示例对话">
            {resolve(data.exampleDialogue, data.name)}
          </PreviewSection>
        )}
      </div>
    );
  }

  if (kind === "worldbook") {
    const data = draft as WorldbookDraft;
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">{data.name}</h2>
          {data.description && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {data.description}
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            {data.entries.length} 个条目 · 扫描深度 {data.scanDepth ?? 4} · 预算{" "}
            {data.tokenBudget ?? 2048} tokens
          </p>
        </div>
        <div className="space-y-3">
          {data.entries.map((entry, index) => (
            <div
              key={`${entry.name}-${index}`}
              className="rounded-xl border border-border/50 bg-background/30 p-3.5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-medium">{entry.name}</h3>
                {entry.constant && (
                  <Badge variant="outline" className="rounded-full">
                    常驻
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground">
                  {entry.position ?? "after_char"}
                </span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {(entry.keys ?? []).map((key) => (
                  <span
                    key={key}
                    className="rounded bg-secondary/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    {key}
                  </span>
                ))}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {resolve(entry.content, data.name)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "prompt") {
    const data = draft as PromptDraft;
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">{data.name}</h2>
          {data.description && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {data.description}
            </p>
          )}
        </div>
        <PreviewSection title="系统提示词">
          {data.systemPrompt}
        </PreviewSection>
        {data.postHistoryInstructions && (
          <PreviewSection title="历史后指令">
            {data.postHistoryInstructions}
          </PreviewSection>
        )}
        {data.blocks && data.blocks.length > 0 && (
          <div>
            <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              提示词块
            </h3>
            <div className="mt-2 space-y-2">
              {data.blocks.map((block, index) => (
                <div
                  key={`${block.name}-${index}`}
                  className="rounded-xl border border-border/50 bg-background/30 p-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium">{block.name}</span>
                    <Badge variant="outline" className="rounded-full">
                      {block.marker ?? block.position}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {block.role} · {block.position}
                    </span>
                  </div>
                  {block.content && (
                    <p className="mt-1.5 whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
                      {block.content}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {data.variables && Object.keys(data.variables).length > 0 && (
          <PreviewSection title="变量">
            {Object.entries(data.variables)
              .map(([key, value]) => `${key} = ${value}`)
              .join("\n")}
          </PreviewSection>
        )}
      </div>
    );
  }

  if (kind === "style") {
    const data = draft as StyleDraft;
    const config = data.config ?? {};
    return (
      <div className="space-y-5">
        <div>
          <h2 className="font-display text-2xl font-semibold">{data.name}</h2>
          {data.description && (
            <p className="mt-1.5 text-sm text-muted-foreground">
              {data.description}
            </p>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">
            {config.layout ?? "bubble"} · {config.fontSize ?? 16}px · 行高{" "}
            {config.lineHeight ?? 1.8} · 强调色 {config.accentColor ?? "默认"}
          </p>
        </div>
        <StylePreview config={config} />
      </div>
    );
  }

  const data = draft as ThemeDraft;
  const swatches = [
    data.tokens["--background"],
    data.tokens["--foreground"],
    data.tokens["--primary"],
    data.tokens["--secondary"],
    data.tokens["--accent"],
  ].filter((color): color is string => Boolean(color));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-semibold">{data.name}</h2>
        {data.description && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            {data.description}
          </p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-muted-foreground">
            {data.mode === "light"
              ? "浅色"
              : data.mode === "dark"
                ? "深色"
                : "通用"}{" "}
            · {Object.keys(data.tokens).length} 个变量
          </span>
          <span className="flex items-center gap-1">
            {swatches.map((color) => (
              <span
                key={color}
                className="size-3.5 rounded-full border border-border/60"
                style={{ background: color }}
              />
            ))}
          </span>
        </div>
      </div>
      <ThemePreview
        tokens={data.tokens}
        backgroundUrl={data.backgroundUrl}
        customCss={data.customCss}
        styleConfig={styleConfig}
        title={data.name}
        subtitle="AI 生成的主题预览"
      />
    </div>
  );
}

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
        {children}
      </p>
    </div>
  );
}
