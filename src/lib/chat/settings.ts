/**
 * 调试模式只属于单个会话，不应该随模板或广场克隆传播。
 * 该函数不修改原对象，返回去掉 debugMode 的新对象。
 */
export function stripDebugMode<T extends object>(
  settings: T | null | undefined,
): T | null | undefined {
  if (!settings) return settings;
  const next = { ...settings };
  delete (next as { debugMode?: boolean }).debugMode;
  return next;
}
