import type { ThemeSnapshot } from "@/db/schema/types";
import { THEME_TOKENS } from "@/lib/theme/tokens";

export type ThemePreset = {
  key: string;
  name: string;
  description: string;
  mode: "dark" | "light" | "both";
  tokens: Record<string, string>;
};

function tokenMap(values: Record<string, string>) {
  const base: Record<string, string> = {};
  for (const token of THEME_TOKENS) {
    base[token.key] = token.defaultValue;
  }
  return { ...base, ...values };
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    key: "warm-gold",
    name: "暖金酒馆",
    description: "深夜木质吧台与琥珀色灯火，醉语的默认气质。",
    mode: "dark",
    tokens: tokenMap({}),
  },
  {
    key: "teal-rain",
    name: "青灯夜雨",
    description: "青绿与雾灰交织，像雨夜窗边的一盏旧灯。",
    mode: "dark",
    tokens: tokenMap({
      "--background": "#0a1114",
      "--foreground": "#dce9e7",
      "--card": "#111c20",
      "--card-foreground": "#dce9e7",
      "--border": "rgba(160, 214, 206, 0.12)",
      "--primary": "#6fbfb2",
      "--primary-foreground": "#06110f",
      "--accent": "#1b2c30",
      "--accent-foreground": "#9fe0d5",
      "--ring": "rgba(111, 191, 178, 0.5)",
      "--secondary": "#17262b",
      "--secondary-foreground": "#dce9e7",
      "--muted": "#17262b",
      "--muted-foreground": "#8aa5a3",
    }),
  },
  {
    key: "parchment",
    name: "旧纸晨光",
    description: "米白纸张、赭石墨迹，适合书信体与慢叙事。",
    mode: "light",
    tokens: tokenMap({
      "--background": "#f4ecdd",
      "--foreground": "#33291f",
      "--card": "#fbf5e9",
      "--card-foreground": "#33291f",
      "--border": "rgba(51, 41, 31, 0.12)",
      "--primary": "#8d5a2b",
      "--primary-foreground": "#fdf8ef",
      "--accent": "#e7d9c2",
      "--accent-foreground": "#6e421b",
      "--ring": "rgba(141, 90, 43, 0.4)",
      "--secondary": "#e9ddc9",
      "--secondary-foreground": "#33291f",
      "--muted": "#e9ddc9",
      "--muted-foreground": "#6f6253",
    }),
  },
  {
    key: "neon",
    name: "赛博霓虹",
    description: "靛紫夜色与电光青，适合科幻、赛博与都市怪谈。",
    mode: "dark",
    tokens: tokenMap({
      "--background": "#080812",
      "--foreground": "#e6e9ff",
      "--card": "#101124",
      "--card-foreground": "#e6e9ff",
      "--border": "rgba(120, 140, 255, 0.16)",
      "--primary": "#62e6d6",
      "--primary-foreground": "#03110f",
      "--accent": "#1b1b3d",
      "--accent-foreground": "#a9b6ff",
      "--ring": "rgba(98, 230, 214, 0.55)",
      "--secondary": "#171833",
      "--secondary-foreground": "#e6e9ff",
      "--muted": "#171833",
      "--muted-foreground": "#9aa3cc",
    }),
  },
];

export function themePreset(key: string | null | undefined) {
  return THEME_PRESETS.find((preset) => preset.key === key) ?? THEME_PRESETS[0]!;
}

export function themeTokensForPreset(key: string | null | undefined) {
  return themePreset(key).tokens;
}

export function themeSnapshotForPreset(
  key: string | null | undefined,
): ThemeSnapshot {
  const preset = themePreset(key);
  return {
    name: preset.name,
    description: preset.description,
    tokens: preset.tokens,
    customCss: null,
    backgroundUrl: null,
    mode: preset.mode,
  };
}
