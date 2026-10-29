import type { StyleConfig } from "@/db/schema/types";
import {
  DEFAULT_REPLY_OPTION_COUNT,
  DEFAULT_REPLY_OPTION_STYLES,
  DEFAULT_STATUS_TAGS,
  STYLE_PRESETS,
} from "@/lib/content/defaults";

export type AidsConfig = {
  enabledStatus: boolean;
  enabledGoal: boolean;
  enabledOptions: boolean;
  statusTags: string[];
  /** 只保留当前标签对应的说明，作为 AI 生成状态的规则 */
  statusTagNotes: Record<string, string>;
  optionStyles: string[];
  optionCount: number;
  /** 配置签名，用于判断已生成的互动信息是否还符合当前样式 */
  key: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sanitizeNote(value: unknown) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function hashText(value: string) {
  let hash = 5381;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }
  return (hash >>> 0).toString(36);
}

function sanitizeLabelList(
  input: unknown,
  fallback: string[],
  maxItems: number,
) {
  const values = Array.isArray(input)
    ? input
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.replace(/\s+/g, " ").trim().slice(0, 16))
        .filter(Boolean)
    : [];
  const unique = [...new Set(values)].slice(0, maxItems);
  return unique.length > 0 ? unique : [...fallback];
}

/**
 * 纯函数，客户端和服务端共用。
 * 客户端用它判断是否需要重新生成，服务端用同一份规则生成提示词。
 */
export function resolveAidsConfig(
  configInput: StyleConfig | null | undefined,
): AidsConfig {
  const config: StyleConfig = {
    ...STYLE_PRESETS[0]!.config,
    ...(configInput ?? {}),
  };
  const statusTags = sanitizeLabelList(
    config.statusTags,
    DEFAULT_STATUS_TAGS,
    12,
  );
  const rawNotes =
    config.statusTagNotes &&
    typeof config.statusTagNotes === "object" &&
    !Array.isArray(config.statusTagNotes)
      ? (config.statusTagNotes as Record<string, unknown>)
      : {};
  const statusTagNotes: Record<string, string> = {};
  for (const label of statusTags) {
    const note = sanitizeNote(rawNotes[label]);
    if (note) statusTagNotes[label] = note;
  }
  const optionStyles = sanitizeLabelList(
    config.replyOptionStyles,
    DEFAULT_REPLY_OPTION_STYLES,
    8,
  );
  const requestedCount = Number(config.replyOptionCount);
  const count = Number.isFinite(requestedCount)
    ? clamp(Math.round(requestedCount), 1, 6)
    : DEFAULT_REPLY_OPTION_COUNT;

  const enabledStatus = Boolean(config.showStatusTags);
  const enabledGoal = Boolean(config.showGoal);
  const enabledOptions = Boolean(config.showReplyOptions);
  const optionCount = Math.min(count, optionStyles.length);

  const keyParts: unknown[] = [
    enabledStatus ? statusTags : null,
    enabledGoal,
    enabledOptions ? optionStyles.slice(0, optionCount) : null,
    enabledOptions ? optionCount : null,
  ];
  // 没有说明时保持旧的签名格式，避免已有对话无意义地重新生成。
  if (enabledStatus && Object.keys(statusTagNotes).length > 0) {
    keyParts.push(hashText(JSON.stringify(statusTagNotes)));
  }

  return {
    enabledStatus,
    enabledGoal,
    enabledOptions,
    statusTags,
    statusTagNotes,
    optionStyles,
    optionCount,
    key: JSON.stringify(keyParts),
  };
}
