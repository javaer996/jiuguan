"use client";

import { useMemo } from "react";
import { buildPreviewFallbackCss } from "@/lib/css/preview-contrast";
import {
  sanitizeCustomCss,
  sanitizeCustomCssPreview,
} from "@/lib/css/sanitize";

/**
 * 编辑器实时预览：完整 CSS 走严格清洗；
 * 输入到一半无法解析时，尽量补全后继续应用，避免预览突然失效。
 * fallbackCss 在作者没写文字色时，按背景亮度补一组兜底颜色。
 */
export function useLiveCustomCss(input: string | null | undefined) {
  return useMemo(() => {
    if (!input?.trim()) {
      return { css: "", error: null as string | null, fallbackCss: "" };
    }
    try {
      const css = sanitizeCustomCss(input);
      return {
        css,
        error: null as string | null,
        fallbackCss: buildPreviewFallbackCss(css),
      };
    } catch (error) {
      const css = sanitizeCustomCssPreview(input);
      return {
        css,
        error:
          error instanceof Error
            ? error.message
            : "CSS 解析失败，预览已尽量补全",
        fallbackCss: buildPreviewFallbackCss(css),
      };
    }
  }, [input]);
}
