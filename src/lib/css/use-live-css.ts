"use client";

import { useMemo } from "react";
import {
  sanitizeCustomCss,
  sanitizeCustomCssPreview,
} from "@/lib/css/sanitize";

/**
 * 编辑器实时预览：完整 CSS 走严格清洗；
 * 输入到一半无法解析时，尽量补全后继续应用，避免预览突然失效。
 */
export function useLiveCustomCss(input: string | null | undefined) {
  return useMemo(() => {
    if (!input?.trim()) {
      return { css: "", error: null as string | null };
    }
    try {
      return { css: sanitizeCustomCss(input), error: null as string | null };
    } catch (error) {
      return {
        css: sanitizeCustomCssPreview(input),
        error:
          error instanceof Error
            ? error.message
            : "CSS 解析失败，预览已尽量补全",
      };
    }
  }, [input]);
}
