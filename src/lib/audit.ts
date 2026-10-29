import { getDb } from "@/db";
import { auditLogs } from "@/db/schema";
import { getClientIp, getUserAgent } from "@/lib/request";

type AuditInput = {
  actorId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  detail?: Record<string, unknown> | null;
  request?: Request;
};

/**
 * 记录管理操作。审计失败只写服务端日志，不影响主流程。
 */
export async function recordAudit({
  actorId,
  action,
  targetType,
  targetId,
  detail,
  request,
}: AuditInput): Promise<void> {
  try {
    await getDb()
      .insert(auditLogs)
      .values({
        actorId: actorId ?? null,
        action,
        targetType: targetType ?? null,
        targetId: targetId ?? null,
        detail: detail ?? null,
        ip: request ? getClientIp(request) : null,
        userAgent: request ? getUserAgent(request) : null,
      });
  } catch (error) {
    console.error("[audit] 写入审计日志失败", error);
  }
}
