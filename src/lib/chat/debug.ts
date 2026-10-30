import type { ChatDebugSnapshotDTO } from "@/lib/types/chat";

/**
 * 调试快照只存在进程内存里：
 * - 每个会话最多保留最近一次请求
 * - 不写数据库，服务重启或进程切换后自动消失
 * - 仅管理员且开启 debugMode 时才会写入和读取
 */
const MAX_SESSIONS = 20;

type DebugStore = Map<string, ChatDebugSnapshotDTO>;

const globalForDebug = globalThis as typeof globalThis & {
  __zyChatDebugStore?: DebugStore;
};

const store: DebugStore =
  globalForDebug.__zyChatDebugStore ?? new Map<string, ChatDebugSnapshotDTO>();

globalForDebug.__zyChatDebugStore = store;

export function beginDebugRequest(sessionId: string) {
  // 新一轮请求开始时清掉上一轮，保证只能看到最近一次。
  store.delete(sessionId);
}

export function saveDebugSnapshot(snapshot: ChatDebugSnapshotDTO) {
  store.delete(snapshot.sessionId);
  store.set(snapshot.sessionId, snapshot);

  while (store.size > MAX_SESSIONS) {
    const oldest = store.keys().next().value;
    if (!oldest) break;
    store.delete(oldest);
  }
}

export function getDebugSnapshot(sessionId: string) {
  return store.get(sessionId) ?? null;
}

export function clearDebugSnapshot(sessionId: string) {
  store.delete(sessionId);
}
