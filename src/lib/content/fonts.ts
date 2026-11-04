/**
 * 对话样式可选字体。
 * 只列出项目里实际加载或系统普遍可用的字体栈，避免用户手写字体名。
 */
export const STYLE_FONT_OPTIONS = [
  { value: "", label: "跟随全局" },
  { value: "var(--font-sans)", label: "无衬线（系统默认）" },
  { value: "var(--font-display)", label: "衬线（宋体 / 思源宋体）" },
  { value: "var(--font-mono)", label: "等宽（JetBrains Mono）" },
  {
    value: '"PingFang SC", "Microsoft YaHei", sans-serif',
    label: "苹方 / 微软雅黑",
  },
  {
    value: '"Noto Serif SC", "Songti SC", "STSong", serif',
    label: "思源宋体 / 宋体",
  },
  {
    value: '"KaiTi", "STKaiti", "Kaiti SC", serif',
    label: "楷体",
  },
] as const;

export function isKnownStyleFont(value: string | null | undefined) {
  return STYLE_FONT_OPTIONS.some((option) => option.value === (value ?? ""));
}

/**
 * 主题 token 里的字体值（--font-sans / --font-display），
 * 必须是具体字体栈，不能再用 var(--font-*) 引用自身。
 */
export const THEME_FONT_OPTIONS = [
  {
    value:
      '"PingFang SC", "Noto Sans SC", "Microsoft YaHei", system-ui, sans-serif',
    label: "无衬线（苹方 / 思源黑体）",
  },
  {
    value: '"Noto Serif SC", "Songti SC", "STSong", Georgia, serif',
    label: "衬线（思源宋体 / 宋体）",
  },
  {
    value: '"KaiTi", "STKaiti", "Kaiti SC", serif',
    label: "楷体",
  },
  {
    value: '"JetBrains Mono", "SFMono-Regular", ui-monospace, monospace',
    label: "等宽（JetBrains Mono）",
  },
  {
    value: '"PingFang SC", "Microsoft YaHei", sans-serif',
    label: "苹方 / 微软雅黑",
  },
] as const;

