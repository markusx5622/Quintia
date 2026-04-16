import { prisma } from "../db/client";
import { TenantContext } from "../types";

export interface AuditEventParams {
  jobId?: string;
  eventType: "stage_started" | "stage_completed" | "validation_failed" | "law4_violation" | "financial_calculated" | "retry" | "escalation";
  stage?: string;
  severity?: "info" | "warning" | "error" | "critical";
  details: Record<string, any>;
}

export class AuditLogger {
  constructor(private readonly ctx: TenantContext) {}

  async log(params: AuditEventParams) {
    return prisma.auditLog.create({
      data: {
        tenant_id: this.ctx.tenantId,
        job_id: params.jobId,
        event_type: params.eventType,
        stage: params.stage,
        severity: params.severity || "info",
        details: JSON.stringify(params.details),
      },
    });
  }
}
