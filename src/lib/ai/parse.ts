import { jsonrepair } from "jsonrepair";
import { ApiError } from "@/lib/api";

/** 去掉模型输出外层的 Markdown 围栏，或截取第一个 JSON 对象。 */
export function stripCodeFence(raw: string) {
  const trimmed = raw.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  if (fenced?.[1]) return fenced[1].trim();

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

/** 宽松解析模型返回的 JSON：先直接解析，失败后尝试 jsonrepair。 */
export function parseLooseJson(raw: string) {
  const text = stripCodeFence(raw);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    try {
      return JSON.parse(jsonrepair(text)) as unknown;
    } catch {
      throw new ApiError(
        502,
        "AI_INVALID_JSON",
        "AI 没有返回合法 JSON，请重试或换一个模型",
      );
    }
  }
}

/** 提取任意 Markdown 围栏中的内容，用于纯 CSS 或代码块回退。 */
export function extractFencedBlock(raw: string) {
  const match = /```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)```/.exec(raw.trim());
  return match?.[1]?.trim() || null;
}
