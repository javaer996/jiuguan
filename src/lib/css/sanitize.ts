import * as csstree from "css-tree";

export class CssSanitizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CssSanitizeError";
  }
}

const SCOPE = ".zy-chat";

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
]);

const FORBIDDEN_VALUE =
  /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|-moz-binding|var\s*\(|attr\s*\(|env\s*\(|image-set\s*\(|[<>\\]/i;

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
 * - 删除所有 at-rule（@import、@font-face、@media 等）
 * - 只保留白名单属性
 * - 拒绝 url()、expression()、CSS 变量、尖括号与反斜杠
 * - 所有选择器自动限定在 .zy-chat 之内
 */
export function sanitizeCustomCss(input: string): string {
  const source = input.trim();
  if (!source) return "";
  if (source.length > 50_000) {
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
      if (list && item) list.remove(item);
    },
  });

  let ruleCount = 0;
  csstree.walk(ast, {
    visit: "Rule",
    enter(node, item, list) {
      ruleCount += 1;
      if (ruleCount > 200) {
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
      if (
        !value ||
        !ALLOWED_PROPERTIES.has(property) ||
        FORBIDDEN_VALUE.test(value) ||
        value.length > 1000
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

  const output = csstree.generate(ast).trim();
  if (!output) {
    throw new CssSanitizeError("自定义 CSS 中没有可用的规则");
  }
  if (output.length > 50_000) {
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
