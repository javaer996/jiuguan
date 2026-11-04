/**
 * 替换聊天文本中的 {{char}} / {{user}} / {{persona}} 占位符。
 * 角色卡开场白、示例对话与 AI 回复都可能带有这些占位符，
 * 展示与拼装历史消息时都需要替换成当前角色和用户身份的名称。
 */
export function applyChatVariables(
  text: string,
  names: { char?: string | null; user?: string | null },
) {
  if (!text) return text;
  return text.replace(
    /\{\{\s*(char|user|persona)\s*\}\}/gi,
    (match, key: string) => {
      const name =
        key.toLowerCase() === "char" ? names.char?.trim() : names.user?.trim();
      return name || match;
    },
  );
}
