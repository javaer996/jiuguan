import * as csstree from "css-tree";

type Rgba = { r: number; g: number; b: number; a: number };

type Target = "container" | "base" | "user" | "assistant";

type BackgroundTrack = {
  colors: Rgba[];
  specificity: number;
  order: number;
};

const LIGHT_TEXT = "#f4f4f7";
const DARK_TEXT = "#1b1b20";
const DARK_THRESHOLD = 0.42;

const BACKGROUND_PROPERTIES = new Set([
  "background",
  "background-color",
  "background-image",
]);

const TEXT_COLOR_PROPERTIES = new Set(["color", "-webkit-text-fill-color"]);

const TEXT_CLASSES = new Set([
  "zy-chat",
  "zy-message",
  "zy-content",
  "zy-bubble",
  "zy-bubble-user",
  "zy-bubble-assistant",
  "chat-prose",
]);

const NAMED_COLORS: Record<string, Rgba> = {
  black: { r: 0, g: 0, b: 0, a: 1 },
  white: { r: 255, g: 255, b: 255, a: 1 },
  transparent: { r: 0, g: 0, b: 0, a: 0 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseHex(value: string): Rgba | null {
  const hex = value.replace(/^#/, "");
  const expanded =
    hex.length === 3 || hex.length === 4
      ? hex
          .split("")
          .map((char) => char + char)
          .join("")
      : hex;
  if (!/^[\da-f]{6}([\da-f]{2})?$/i.test(expanded)) return null;
  return {
    r: parseInt(expanded.slice(0, 2), 16),
    g: parseInt(expanded.slice(2, 4), 16),
    b: parseInt(expanded.slice(4, 6), 16),
    a: expanded.length === 8 ? parseInt(expanded.slice(6, 8), 16) / 255 : 1,
  };
}

function parseChannel(value: string, scale: number) {
  const number = value.endsWith("%")
    ? (parseFloat(value) / 100) * scale
    : parseFloat(value);
  return Number.isFinite(number) ? number : Number.NaN;
}

function hueToRgb(p: number, q: number, t: number) {
  let value = t;
  if (value < 0) value += 1;
  if (value > 1) value -= 1;
  if (value < 1 / 6) return p + (q - p) * 6 * value;
  if (value < 1 / 2) return q;
  if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
  return p;
}

function parseHslFunction(parts: string[], alpha: number): Rgba | null {
  if (parts.length < 3) return null;
  const hue = parseFloat(parts[0]!);
  const saturation = parseFloat(parts[1]!);
  const lightness = parseFloat(parts[2]!);
  if (![hue, saturation, lightness].every(Number.isFinite)) return null;

  const h = (((hue % 360) + 360) % 360) / 360;
  const s = clamp(saturation / 100, 0, 1);
  const l = clamp(lightness / 100, 0, 1);

  if (s === 0) {
    const gray = Math.round(l * 255);
    return { r: gray, g: gray, b: gray, a: alpha };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hueToRgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, h) * 255),
    b: Math.round(hueToRgb(p, q, h - 1 / 3) * 255),
    a: alpha,
  };
}

function parseColorFunction(raw: string): Rgba | null {
  const open = raw.indexOf("(");
  const close = raw.lastIndexOf(")");
  if (open < 0 || close <= open) return null;
  const name = raw.slice(0, open).trim().toLowerCase();
  if (name !== "rgb" && name !== "rgba" && name !== "hsl" && name !== "hsla") {
    return null;
  }

  const parts = raw
    .slice(open + 1, close)
    .split(/[\s,/]+/)
    .filter(Boolean);
  if (parts.length < 3) return null;

  const a =
    parts[3] === undefined
      ? 1
      : parts[3].endsWith("%")
        ? parseFloat(parts[3]) / 100
        : parseFloat(parts[3]);
  if (!Number.isFinite(a)) return null;

  if (name === "hsl" || name === "hsla") {
    return parseHslFunction(parts, clamp(a, 0, 1));
  }

  const r = parseChannel(parts[0]!, 255);
  const g = parseChannel(parts[1]!, 255);
  const b = parseChannel(parts[2]!, 255);

  if ([r, g, b].some((value) => !Number.isFinite(value))) return null;

  return {
    r: clamp(r, 0, 255),
    g: clamp(g, 0, 255),
    b: clamp(b, 0, 255),
    a: clamp(a, 0, 1),
  };
}

function collectColors(value: csstree.CssNode) {
  const colors: Rgba[] = [];
  csstree.walk(value, {
    enter(node: csstree.CssNode) {
      if (node.type === "Hash") {
        const color = parseHex(node.value);
        if (color) colors.push(color);
        return;
      }
      if (node.type === "Function") {
        const color = parseColorFunction(csstree.generate(node));
        if (color) colors.push(color);
        return;
      }
      if (node.type === "Identifier") {
        const color = NAMED_COLORS[node.name.toLowerCase()];
        if (color) colors.push(color);
      }
    },
  });
  return colors;
}

function luminance(color: Rgba) {
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.03928
      ? scaled / 12.92
      : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return (
    0.2126 * channel(color.r) +
    0.7152 * channel(color.g) +
    0.0722 * channel(color.b)
  );
}

function averageLuminance(colors: Rgba[]) {
  const visible = colors.filter((color) => color.a > 0.05);
  if (visible.length === 0) return null;

  const weight = visible.reduce((sum, color) => sum + color.a, 0);
  const total = visible.reduce(
    (sum, color) => sum + luminance(color) * color.a,
    0,
  );
  return total / weight;
}

function textColorFor(brightness: number) {
  return brightness < DARK_THRESHOLD ? LIGHT_TEXT : DARK_TEXT;
}

function analyzeSelector(selector: string) {
  const hasPseudoElement = /::[a-zA-Z-]+/.test(selector);
  const stateful =
    /:(?:hover|focus|active|visited|focus-visible|focus-within)\b/i.test(
      selector,
    );
  const withoutPseudo = selector.replace(/::[a-zA-Z-]+(?:\([^)]*\))?/g, "");
  const subject =
    withoutPseudo.split(/[\s>+~]+/).filter(Boolean).at(-1) ?? "";
  const classes = new Set(
    (subject.match(/\.[\w-]+/g) ?? []).map((token) => token.slice(1)),
  );

  return { classes, stateful, hasPseudoElement };
}

function targetOf(classes: Set<string>): Target | null {
  if (classes.has("zy-bubble-user")) return "user";
  if (classes.has("zy-bubble-assistant")) return "assistant";
  if (classes.has("zy-content") || classes.has("zy-bubble")) return "base";
  if (classes.has("zy-chat")) return "container";
  return null;
}

function isTextElement(classes: Set<string>) {
  for (const name of TEXT_CLASSES) {
    if (classes.has(name)) return true;
  }
  return false;
}

function specificityOf(selector: string) {
  const ids = (selector.match(/#[\w-]+/g) ?? []).length;
  const classes = (
    selector.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+(?:\([^)]*\))?/g) ?? []
  ).length;
  const types = (selector.match(/(^|[\s>+~])[a-zA-Z][\w-]*/g) ?? []).length;
  return ids * 100 + classes * 10 + types;
}

function trackBackground(
  tracks: Partial<Record<Target, BackgroundTrack>>,
  target: Target,
  colors: Rgba[],
  specificity: number,
  order: number,
) {
  const current = tracks[target];
  if (
    !current ||
    specificity > current.specificity ||
    (specificity === current.specificity && order >= current.order)
  ) {
    tracks[target] = { colors, specificity, order };
  }
}

/**
 * 预览专用：自定义 CSS 可能只改背景不改文字色，
 * 编辑器界面与聊天主题的文字色又可能不同。
 * 这里按背景亮度生成低优先级兜底文字色；作者写了 color 时直接跳过。
 */
export function buildPreviewFallbackCss(css: string) {
  if (!css.trim()) return "";

  let ast: csstree.CssNode;
  try {
    ast = csstree.parse(css, { positions: false, parseValue: true });
  } catch {
    return "";
  }

  const tracks: Partial<Record<Target, BackgroundTrack>> = {};
  let hasTextColor = false;
  let order = 0;

  csstree.walk(ast, {
    visit: "Declaration",
    enter(node) {
      if (this.atrule || !this.rule) return;

      const property = node.property.toLowerCase();
      const isBackground = BACKGROUND_PROPERTIES.has(property);
      const isTextColor = TEXT_COLOR_PROPERTIES.has(property);
      if (!isBackground && !isTextColor) return;

      const prelude = this.rule.prelude;
      if (!prelude) return;

      order += 1;
      const colors = isBackground ? collectColors(node.value) : [];
      const selectors =
        prelude.type === "SelectorList"
          ? prelude.children.toArray()
          : [prelude];

      for (const selectorNode of selectors) {
        const selector = csstree.generate(selectorNode);
        const info = analyzeSelector(selector);
        if (info.stateful || info.hasPseudoElement) continue;

        if (isTextColor && isTextElement(info.classes)) {
          hasTextColor = true;
        }

        const target = targetOf(info.classes);
        if (!target || !isBackground || colors.length === 0) continue;

        trackBackground(
          tracks,
          target,
          colors,
          specificityOf(selector),
          order,
        );
      }
    },
  });

  if (hasTextColor) return "";

  const rules: string[] = [];

  const containerLuminance = tracks.container
    ? averageLuminance(tracks.container.colors)
    : null;
  if (containerLuminance !== null) {
    rules.push(`.zy-chat{color:${textColorFor(containerLuminance)}}`);
  }

  const baseLuminance = tracks.base
    ? averageLuminance(tracks.base.colors)
    : null;
  if (baseLuminance !== null) {
    rules.push(`.zy-chat .zy-content{color:${textColorFor(baseLuminance)}}`);
  }

  const userLuminance = tracks.user
    ? averageLuminance(tracks.user.colors)
    : null;
  if (userLuminance !== null) {
    rules.push(
      `.zy-chat .zy-bubble.zy-bubble-user{color:${textColorFor(userLuminance)}}`,
    );
  }

  const assistantLuminance = tracks.assistant
    ? averageLuminance(tracks.assistant.colors)
    : null;
  if (assistantLuminance !== null) {
    rules.push(
      `.zy-chat .zy-bubble.zy-bubble-assistant{color:${textColorFor(assistantLuminance)}}`,
    );
  }

  return rules.join("\n");
}
