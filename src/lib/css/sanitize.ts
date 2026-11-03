import * as csstree from "css-tree";

export class CssSanitizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CssSanitizeError";
  }
}

const SCOPE = ".zy-chat";

export const CSS_SCOPE = SCOPE;

export const CSS_LIMITS = {
  maxRules: 200,
  maxLength: 50_000,
  maxValueLength: 1_000,
} as const;

const ALLOWED_PROPERTIES = new Set([
  "color",
  "background",
  "background-color",
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
  "background-clip",
  "-webkit-background-clip",
  "-webkit-text-fill-color",
  "background-origin",
  "border",
  "border-color",
  "border-style",
  "border-width",
  "border-radius",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-top-color",
  "border-right-color",
  "border-bottom-color",
  "border-left-color",
  "border-top-style",
  "border-right-style",
  "border-bottom-style",
  "border-left-style",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-top-left-radius",
  "border-top-right-radius",
  "border-bottom-left-radius",
  "border-bottom-right-radius",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "font",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "font-variant",
  "font-feature-settings",
  "font-variant-ligatures",
  "font-variant-numeric",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "text-align",
  "text-align-last",
  "text-wrap",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-style",
  "text-transform",
  "text-indent",
  "text-shadow",
  "-webkit-text-stroke",
  "-webkit-text-stroke-color",
  "-webkit-text-stroke-width",
  "white-space",
  "word-break",
  "overflow-wrap",
  "word-wrap",
  "display",
  "flex",
  "flex-direction",
  "flex-wrap",
  "flex-grow",
  "flex-shrink",
  "flex-basis",
  "align-items",
  "align-content",
  "align-self",
  "justify-content",
  "gap",
  "row-gap",
  "column-gap",
  "order",
  "width",
  "min-width",
  "max-width",
  "height",
  "min-height",
  "max-height",
  "box-sizing",
  "opacity",
  "box-shadow",
  "filter",
  "clip-path",
  "list-style",
  "list-style-type",
  "list-style-position",
  "vertical-align",
  "object-fit",
  "object-position",
  "outline",
  "outline-color",
  "outline-style",
  "outline-width",
  "outline-offset",
  "overflow",
  "overflow-x",
  "overflow-y",
  "float",
  "clear",
  "columns",
  "column-count",
  "content",
  "hyphens",
  "transform",
  "transform-origin",
  "transition",
  "transition-property",
  "transition-duration",
  "transition-timing-function",
  "animation",
  "animation-name",
  "animation-duration",
  "animation-timing-function",
  "animation-delay",
  "animation-iteration-count",
  "animation-direction",
  "animation-fill-mode",
  "animation-play-state",
  "backdrop-filter",
  "-webkit-backdrop-filter",
  "background-blend-mode",
  "mix-blend-mode",
]);

/** Property names exported for the AI prompt builder. */
export const ALLOWED_CSS_PROPERTIES: readonly string[] = Array.from(
  ALLOWED_PROPERTIES,
);

const FORBIDDEN_VALUE =
  /expression\s*\(|javascript:|@import|behavior\s*:|-moz-binding|var\s*\(|attr\s*\(|env\s*\(|image-set\s*\(|[<>\\]/i;

const ALLOWED_AT_RULES = new Set([
  "media",
  "supports",
  "keyframes",
  "-webkit-keyframes",
]);

/** 只有背景相关属性可以引用图片地址。 */
const URL_PROPERTIES = new Set(["background", "background-image"]);

const FORBIDDEN_AT_RULE_PRELUDE =
  /[{}<>\\@]|url\s*\(|expression\s*\(|javascript:|behavior\s*:|-moz-binding|var\s*\(|attr\s*\(|env\s*\(|image-set\s*\(/i;

const KEYFRAMES_NAME = /^(--)?[A-Za-z_][A-Za-z0-9_-]*$/;

const KEYFRAME_SELECTOR = /^(from|to|\d+(?:\.\d+)?%)$/i;

function isKeyframesAtRule(atrule: csstree.Atrule | null): boolean {
  if (!atrule) return false;
  const name = atrule.name.toLowerCase();
  return name === "keyframes" || name === "-webkit-keyframes";
}

function isPrivateIpv4(host: string) {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  const octets = parts.map((part) =>
    /^\d{1,3}$/.test(part) ? Number(part) : Number.NaN,
  );
  if (
    octets.some(
      (value) => !Number.isInteger(value) || value < 0 || value > 255,
    )
  ) {
    return false;
  }
  const [a, b] = octets as [number, number, number, number];
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateHostname(hostname: string) {
  const host = hostname
    .replace(/^\[|\]$/g, "")
    .toLowerCase()
    .replace(/\.+$/, "");
  if (!host) return true;
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    return true;
  }
  if (host.includes(":")) {
    if (host === "::" || host === "::1") return true;
    if (host.startsWith("fc") || host.startsWith("fd")) return true;
    if (/^fe[89ab]/.test(host)) return true;
    if (host.startsWith("::ffff:")) return isPrivateIpv4(host.slice(7));
    return false;
  }
  return isPrivateIpv4(host);
}

/** 背景图只接受站内上传路径或公网 http(s) 地址。 */
function isSafeCssUrl(raw: string) {
  const value = raw.trim();
  if (!value || value.length > 2048) return false;
  if (/[\s"'`<>\\]/.test(value)) return false;

  if (value.startsWith("/uploads/")) {
    return !value.includes("..") && !value.includes("//");
  }

  if (!/^https?:\/\//i.test(value)) return false;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return false;
  if (url.username || url.password) return false;
  return Boolean(url.hostname) && !isPrivateHostname(url.hostname);
}

function hasOnlySafeUrls(node: csstree.Declaration) {
  let found = false;
  let safe = true;
  csstree.walk(node.value, {
    visit: "Url",
    enter(urlNode) {
      found = true;
      if (!isSafeCssUrl(urlNode.value)) safe = false;
    },
  });
  return !found || safe;
}

function isValidAtRule(atrule: csstree.Atrule) {
  if (!atrule.block) return false;
  const prelude = atrule.prelude
    ? csstree.generate(atrule.prelude).trim()
    : "";
  if (!prelude || prelude.length > CSS_LIMITS.maxValueLength) return false;
  if (isKeyframesAtRule(atrule)) return KEYFRAMES_NAME.test(prelude);
  return !FORBIDDEN_AT_RULE_PRELUDE.test(prelude);
}

function isKeyframeSelector(prelude: csstree.CssNode) {
  return csstree
    .generate(prelude)
    .split(",")
    .every((part) => KEYFRAME_SELECTOR.test(part.trim()));
}

// 子代选择器里的 ">" 是合法且常用的；这里只拦截会破坏选择器结构的字符。
const FORBIDDEN_SELECTOR = /[{}<@\\]/;

function prefixSingle(selector: string): string | null {
  const trimmed = selector.trim();
  if (!trimmed || FORBIDDEN_SELECTOR.test(trimmed)) return null;
  return trimmed.startsWith(SCOPE) ? trimmed : `${SCOPE} ${trimmed}`;
}

function prefixSelector(prelude: csstree.CssNode): string | null {
  if (prelude.type === "SelectorList") {
    const parts = prelude.children
      .toArray()
      .map((selector) => prefixSingle(csstree.generate(selector)))
      .filter((selector): selector is string => Boolean(selector));
    return parts.length > 0 ? parts.join(", ") : null;
  }

  return prefixSingle(csstree.generate(prelude));
}

/**
 * 清洗用户自定义 CSS：
 * - 仅保留 @media、@supports 与 @keyframes，其余 at-rule 删除
 * - 只保留白名单属性
 * - url() 仅允许出现在 background / background-image，且只接受 /uploads/ 或公网 http(s)
 * - 拒绝 expression()、CSS 变量、尖括号与反斜杠
 * - 普通选择器自动限定在 .zy-chat 之内，关键帧选择器保持原样
 */
export function sanitizeCustomCss(input: string): string {
  const source = input.trim();
  if (!source) return "";
  if (source.length > CSS_LIMITS.maxLength) {
    throw new CssSanitizeError("自定义 CSS 不能超过 50000 个字符");
  }

  let ast: csstree.CssNode;
  try {
    ast = csstree.parse(source, {
      positions: false,
      parseValue: true,
      parseCustomProperty: false,
    });
  } catch (error) {
    throw new CssSanitizeError(
      error instanceof Error ? `CSS 解析失败：${error.message}` : "CSS 解析失败",
    );
  }

  csstree.walk(ast, {
    visit: "Atrule",
    enter(node, item, list) {
      const name = node.name.toLowerCase();
      if (
        !ALLOWED_AT_RULES.has(name) ||
        isKeyframesAtRule(this.atrule) ||
        !isValidAtRule(node)
      ) {
        if (list && item) list.remove(item);
      }
    },
  });

  let ruleCount = 0;
  csstree.walk(ast, {
    visit: "Rule",
    enter(node, item, list) {
      if (isKeyframesAtRule(this.atrule)) {
        // 关键帧内部的 from / to / 百分比选择器保持原样，不加作用域。
        if (!isKeyframeSelector(node.prelude)) {
          if (list && item) list.remove(item);
        }
        return;
      }

      ruleCount += 1;
      if (ruleCount > CSS_LIMITS.maxRules) {
        if (list && item) list.remove(item);
        return;
      }

      const selector = prefixSelector(node.prelude);
      if (!selector) {
        if (list && item) list.remove(item);
        return;
      }

      node.prelude = csstree.parse(selector, {
        context: "selectorList",
        positions: false,
      }) as csstree.SelectorList;
    },
  });

  csstree.walk(ast, {
    visit: "Declaration",
    enter(node, item, list) {
      const property = node.property.toLowerCase();
      const value = csstree.generate(node.value).trim();
      const usesUrl = /url\s*\(/i.test(value);
      if (
        !value ||
        !ALLOWED_PROPERTIES.has(property) ||
        FORBIDDEN_VALUE.test(value) ||
        value.length > CSS_LIMITS.maxValueLength ||
        (usesUrl &&
          (!URL_PROPERTIES.has(property) || !hasOnlySafeUrls(node)))
      ) {
        if (list && item) list.remove(item);
      }
    },
  });

  csstree.walk(ast, {
    visit: "Rule",
    enter(node, item, list) {
      if (node.block.children.size === 0) {
        if (list && item) list.remove(item);
      }
    },
  });

  csstree.walk(ast, {
    visit: "Atrule",
    enter(node, item, list) {
      if (!node.block || node.block.children.size === 0) {
        if (list && item) list.remove(item);
      }
    },
  });

  const output = csstree.generate(ast).trim();
  if (!output) {
    throw new CssSanitizeError("自定义 CSS 中没有可用的规则");
  }
  if (output.length > CSS_LIMITS.maxLength) {
    throw new CssSanitizeError("清洗后的 CSS 仍然过长");
  }
  return output;
}

/** 渲染时使用：清洗失败就忽略，不让坏 CSS 影响聊天。 */
export function sanitizeCustomCssSafe(input: string | null | undefined): string {
  if (!input?.trim()) return "";
  try {
    return sanitizeCustomCss(input);
  } catch {
    return "";
  }
}

function openBraceDepth(source: string) {
  let depth = 0;
  let quote: string | null = null;
  let inComment = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (inComment) {
      if (char === "*" && next === "/") {
        inComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (char === "\\") {
        index += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === "/" && next === "*") {
      inComment = true;
      index += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    else if (char === "}") depth -= 1;
  }

  return Math.max(0, depth);
}

/**
 * 预览专用：输入到一半时尽量补全右括号，
 * 让编辑器里的实时预览在输入过程中也能持续更新。
 */
export function sanitizeCustomCssPreview(
  input: string | null | undefined,
): string {
  if (!input?.trim()) return "";
  try {
    return sanitizeCustomCss(input);
  } catch {
    // 继续尝试补全
  }

  const suffix = "}".repeat(openBraceDepth(input));
  const candidates = [input + suffix];
  const withoutTail = input.replace(/[^;{}]*$/, "");
  if (withoutTail !== input) {
    candidates.push(withoutTail + suffix);
  }

  for (const candidate of candidates) {
    try {
      return sanitizeCustomCss(candidate);
    } catch {
      // 尝试下一个补全方式
    }
  }
  return "";
}
