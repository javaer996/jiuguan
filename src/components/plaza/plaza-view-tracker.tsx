"use client";

import { useEffect } from "react";
import { apiFetch } from "@/lib/client/api";

export function PlazaViewTracker({ templateId }: { templateId: string }) {
  useEffect(() => {
    const day = new Date().toISOString().slice(0, 10);
    const key = `plaza-view:${templateId}:${day}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // 隐私模式下 sessionStorage 不可用时仍然上报
    }

    void apiFetch(`/api/plaza/templates/${templateId}/view`, {
      method: "POST",
    }).catch(() => {
      // 浏览统计失败不影响页面
    });
  }, [templateId]);

  return null;
}
