import type { ChatAids } from "@/db/schema/types";
import type { AidsConfig } from "@/lib/chat/aids-config";

/** 主回复末尾的隐藏互动信息区块标记。 */
export const AIDS_START_MARKER = "<<<ZY_AIDS>>>";
export const AIDS_END_MARKER = "<<<END_ZY_AIDS>>>";

export function statusNoteLines(config: AidsConfig) {
  return config.statusTags
    .map((label) => {
      const note = config.statusTagNotes[label];
      return note ? `- ${label}：${note}` : "";
    })
    .filter(Boolean);
}

export function buildAidsExample(config: AidsConfig) {
  const example: Record<string, unknown> = {};
  if (config.enabledStatus) {
    example.status = config.statusTags.map((label) => ({
      label,
      value: "简短状态",
    }));
  }
  if (config.enabledGoal) {
    example.goal = "一句话描述当前想推进的目标";
  }
  if (config.enabledOptions) {
    example.options = config.optionStyles
      .slice(0, config.optionCount)
      .map((style) => ({
        style,
        text: "用户第一人称可以说出口的话或做出的动作",
      }));
  }
  return example;
}

export function buildAidsRules(config: AidsConfig) {
  const rules: string[] = [];
  const notes = statusNoteLines(config);

  if (config.enabledStatus) {
    rules.push(
      `status 必须按顺序覆盖这些标签：${config.statusTags.join("、")}；每个 value 不超过 20 字。`,
    );
    if (notes.length > 0) {
      rules.push(
        "【状态标签说明】只规定每个状态的含义、取值范围和变化方式；必须严格按对应标签的说明填写 value，但不要把说明原文当作状态值输出。",
        "如果状态说明与对话中已经发生的事实冲突，以对话事实为准，不要为了满足说明而编造剧情。",
      );
    }
  }
  if (config.enabledGoal) {
    rules.push(
      "goal 用一句 20-60 字的话描述角色在当前场景中想推进的即时目标，不要写成长期剧情大纲。",
    );
  }
  if (config.enabledOptions) {
    rules.push(
      `options 必须生成 ${config.optionCount} 个，style 只能从这些风格中选择且不重复：${config.optionStyles
        .slice(0, config.optionCount)
        .join("、")}。`,
      "每个 option 的 text 是用户接下来可以说的话或做的动作，第一人称，20-100 字，要贴合当前场景且彼此明显不同。",
      "不要在 option 里替角色说话，也不要写成旁白或解释。",
    );
  }
  return rules;
}

/**
 * 让主回复模型在正文末尾附带互动信息，避免每条消息额外调用一次接口。
 * 这些标记和 JSON 会被服务端剥离，不会进入用户看到的消息正文。
 */
export function buildAidsOutputInstruction(
  config: AidsConfig,
  previous?: ChatAids,
) {
  const notes = statusNoteLines(config);
  const previousStatus = previous?.status
    ?.map((item) => `${item.label}=${item.value}`)
    .join("；");
  const previousGoal = previous?.goal;
  const previousLines =
    previousStatus || previousGoal
      ? [
          "【上一轮状态与目标（可延续或合理更新，不要无故重置）】",
          ...(previousStatus ? [`状态：${previousStatus}`] : []),
          ...(previousGoal ? [`目标：${previousGoal}`] : []),
        ]
      : [];
  const lines = [
    "完成角色回复正文后，必须另起一行输出以下隐藏区块，供程序读取；这个区块不会展示给用户。",
    AIDS_START_MARKER,
    JSON.stringify(buildAidsExample(config), null, 2),
    AIDS_END_MARKER,
    "要求：",
    "- 正文只写角色回复，不要在正文中解释、提及、复述或续写这个区块。",
    "- 区块内只输出一个合法 JSON 对象，不要 Markdown 代码块、注释或额外文字。",
    "- 上面的区块只是结构示例，所有字段都要根据本轮对话重新填写，不要照抄示例文字。",
    "- 区块必须放在整条回复的最后，两个标记必须完整。",
    ...buildAidsRules(config).map((rule) => `- ${rule}`),
    ...previousLines,
    ...(notes.length > 0
      ? [`【状态标签说明】\n${notes.join("\n")}`]
      : []),
    "- 信息不足时使用「未知」或保持模糊，不要编造。",
  ];
  return lines.join("\n");
}
