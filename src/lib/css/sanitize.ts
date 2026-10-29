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
  "line-height",
  "letter-spacing",
  "word-spacing",
  "text-align",
  "text-decoration",
  "text-decoration-color",
  "text-decoration-line",
  "text-decoration-style",
  "text-transform",
  "text-indent",
  "text-shadow",
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
]);

const FORBIDDEN_VALUE =
  /url\s*\(|expression\s*\(|javascript:|@import|behavior\s*:|-moz-binding|var\s*\(|attr\s*\(|env\s*\(|image-set\s*\(|[<>\\]/i;

const FORBIDDEN_SELECTOR = /[{}<>@\\]/;

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
