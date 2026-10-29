/** 粗略的 token 估算：中文按 1.7 字/token，足够做上下文预算。 */
export function estimateTokens(text: string) {
  if (!text) return 0;
  return Math.ceil(text.length / 1.7);
}
