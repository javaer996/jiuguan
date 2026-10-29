import type { CSSProperties } from "react";

export class ThemeTokenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ThemeTokenError";
  }
}

export type ThemeTokenKind = "color" | "length" | "font";

export type ThemeTokenDefinition = {
  key: string;
  label: string;
  group: "基础" | "强调" | "层次" | "排版";
  kind: ThemeTokenKind;
  defaultValue: string;
  hint?: string;
};

/**
 * 只允许主题覆盖这些设计变量。
 * 键名与 globals.css 中的 CSS 变量一一对应，值会被限制为安全的 CSS 片段。
 */
export const THEME_TOKENS: ThemeTokenDefinition[] = [
  {
    key: "--background",
    label: "页面背景",
    group: "基础",
    kind: "color",
    defaultValue: "#0d0b12",
  },
  {
    key: "--foreground",
    label: "正文",
    group: "基础",
    kind: "color",
    defaultValue: "#ece7df",
  },
  {
    key: "--card",
    label: "卡片背景",
    group: "基础",
    kind: "color",
    defaultValue: "#16131d",
  },
  {
    key: "--card-foreground",
    label: "卡片文字",
    group: "基础",
    kind: "color",
    defaultValue: "#ece7df",
  },
  {
    key: "--border",
    label: "边框",
    group: "基础",
    kind: "color",
    defaultValue: "rgba(255, 255, 255, 0.08)",
  },
  {
    key: "--primary",
    label: "主色",
    group: "强调",
    kind: "color",
    defaultValue: "#e0a45e",
  },
  {
    key: "--primary-foreground",
    label: "主色文字",
    group: "强调",
    kind: "color",
    defaultValue: "#1a1208",
  },
  {
    key: "--accent",
    label: "强调底色",
    group: "强调",
    kind: "color",
    defaultValue: "#2a2434",
  },
  {
    key: "--accent-foreground",
    label: "强调文字",
    group: "强调",
    kind: "color",
    defaultValue: "#f0c987",
  },
  {
    key: "--ring",
    label: "聚焦光环",
    group: "强调",
    kind: "color",
    defaultValue: "rgba(224, 164, 94, 0.55)",
  },
  {
    key: "--secondary",
    label: "次级背景",
    group: "层次",
    kind: "color",
    defaultValue: "#241f2e",
  },
  {
    key: "--secondary-foreground",
    label: "次级文字",
    group: "层次",
    kind: "color",
    defaultValue: "#ece7df",
  },
  {
    key: "--muted",
    label: "弱化背景",
    group: "层次",
    kind: "color",
    defaultValue: "#241f2e",
  },
  {
    key: "--muted-foreground",
    label: "弱化文字",
    group: "层次",
    kind: "color",
    defaultValue: "#9a93a8",
  },
  {
    key: "--radius",
    label: "圆角",
    group: "排版",
    kind: "length",
    defaultValue: "0.75rem",
    hint: "例如 0.75rem 或 12px",
  },
  {
    key: "--font-sans",
    label: "正文字体",
    group: "排版",
    kind: "font",
    defaultValue:
      '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif',
  },
  {
    key: "--font-display",
    label: "标题字体",
    group: "排版",
    kind: "font",
    defaultValue: '"Noto Serif SC", "Songti SC", "STSong", Georgia, serif',
  },
];

export const THEME_TOKEN_KEYS = new Set(THEME_TOKENS.map((token) => token.key));

const FORBIDDEN_VALUE =
  /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|-moz-binding|[<>\\;{}]/i;

const MAX_VALUE_LENGTH = 200;

function isSafeValue(value: string) {
  return (
    value.length > 0 &&
    value.length <= MAX_VALUE_LENGTH &&
    !FORBIDDEN_VALUE.test(value)
  );
}

function normalizeValue(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * 严格校验主题变量：出现未知键或危险值直接报错。
 * API 写入时使用，避免静默丢弃用户以为保存成功的配置。
 */
export function sanitizeThemeTokens(input: unknown): Record<string, string> {
  if (input == null) return {};
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new ThemeTokenError("主题变量必须是一个对象");
  }

  const entries = Object.entries(input as Record<string, unknown>);
  if (entries.length > THEME_TOKENS.length) {
    throw new ThemeTokenError("主题变量数量超出限制");
  }

  const output: Record<string, string> = {};
  for (const [key, raw] of entries) {
    if (!THEME_TOKEN_KEYS.has(key)) {
      throw new ThemeTokenError(`不支持的主题变量：${key}`);
    }
    if (typeof raw !== "string") {
      throw new ThemeTokenError(`主题变量 ${key} 的值必须是字符串`);
    }
    const value = normalizeValue(raw);
    if (!isSafeValue(value)) {
      throw new ThemeTokenError(`主题变量 ${key} 的值不合法`);
    }
    output[key] = value;
  }
  return output;
}

/** 渲染时使用：坏值直接忽略，不影响聊天。 */
export function sanitizeThemeTokensSafe(
  input: unknown,
): Record<string, string> {
  if (input == null || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }
  const output: Record<string, string> = {};
  for (const [key, raw] of Object.entries(input as Record<string, unknown>)) {
    if (!THEME_TOKEN_KEYS.has(key) || typeof raw !== "string") continue;
    const value = normalizeValue(raw);
    if (isSafeValue(value)) output[key] = value;
  }
  return output;
}

/** 把主题变量转换成 React 内联样式，作用域内所有 Tailwind 变量会随之改变。 */
export function themeTokensToStyle(input: unknown): CSSProperties {
  const tokens = sanitizeThemeTokensSafe(input);
  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    style[key] = value;
  }
  return style as CSSProperties;
}

/**
 * 背景图只允许站内上传路径或 http(s) 地址。
 * 拒绝 data:、javascript:、file: 等协议，避免绕过图片处理。
 */
export function sanitizeThemeBackgroundUrl(
  input: string | null | undefined,
): string | null {
  const value = input?.trim();
  if (!value) return null;

  if (/^\/uploads\/[A-Za-z0-9/._-]+$/.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.toString();
    }
  } catch {
    // 落到下面统一报错
  }

  throw new ThemeTokenError("背景图必须是站内上传地址或 http(s) 图片链接");
}

export function sanitizeThemeBackgroundUrlSafe(
  input: string | null | undefined,
): string | null {
  try {
    return sanitizeThemeBackgroundUrl(input);
  } catch {
    return null;
  }
}
