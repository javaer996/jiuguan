/** 去掉末尾斜杠，兼容用户粘贴带 / 的地址。 */
export function normalizeBaseUrl(input: string) {
  return input.trim().replace(/\/+$/, "");
}

/** 支持用户直接填写完整的 /chat/completions 地址。 */
export function chatCompletionsUrl(baseUrl: string) {
  const base = normalizeBaseUrl(baseUrl);
  if (/\/chat\/completions$/i.test(base)) return base;
  return `${base}/chat/completions`;
}

export function modelsUrl(baseUrl: string) {
  const base = normalizeBaseUrl(baseUrl).replace(/\/chat\/completions$/i, "");
  if (/\/models$/i.test(base)) return base;
  return `${base}/models`;
}
