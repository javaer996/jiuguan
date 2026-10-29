"use client";

import { createContext, useContext } from "react";

/**
 * 聊天页会把当前主题同步到这里，让桌面侧栏和移动端抽屉
 * 与聊天背景使用同一组颜色变量。
 */
export type ShellTheme = {
  tokens: Record<string, string>;
  backgroundUrl: string | null;
};

type ShellThemeContextValue = {
  theme: ShellTheme | null;
  setTheme: (theme: ShellTheme | null) => void;
};

const NOOP: ShellThemeContextValue = {
  theme: null,
  setTheme: () => {},
};

export const ShellThemeContext =
  createContext<ShellThemeContextValue>(NOOP);

export function useShellTheme() {
  return useContext(ShellThemeContext);
}
