import { prisma } from "../db/client";

export enum AuditEventType {
  STAGE_STARTED = "stage_started",
  STAGE_COMPLETED = "stage_completed",
  VALIDATION_FAILED = "validation_failed",
  LAW4_VIOLATION = "law4_violation",
  FINANCIAL_CALCULATED = "financial_calculated",
  RETRY = "retry",
  ESCALATION = "escalation",
  JOB_CLAIMED = "job_claimed",
  JOB_HEARTBEAT = "job_heartbeat",
  JOB_STALE_RECLAIMED = "job_stale_reclaimed",
  EXECUTION_RESUMED = "execution_resumed"
}

export type AuditSeverity = "info" | "warning" | "error" | "critical";

export class AuditService {
  static async log(params: {
    tenantId: string;
    jobId?: string;
    eventType: AuditEventType;
    stage?: string;
    severity?: AuditSeverity;
    details: any;
  }) {
    // console.log(`[AuditLog] ${params.eventType} | Job: ${params.jobId || 'N/A'} | Severity: ${params.severity || 'info'}`);
    
    return prisma.auditLog.create({
      data: {
        tenant_id: params.tenantId,
        job_id: params.jobId,
        event_type: params.eventType,
        stage: params.stage,
        severity: params.severity || "info",
        details: JSON.stringify(params.details)
      }
    });
  }
}
