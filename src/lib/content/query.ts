/** 转义 LIKE 通配符，避免用户输入 %/_ 造成全表扫描。 */
export function likePattern(input: string): string {
  return `%${input.replace(/[\\%_]/g, (char) => `\\${char}`)}%`;
}

export function parseLimit(
  value: string | null,
  fallback = 50,
  max = 100,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), max);
}

export function parseOffset(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}
