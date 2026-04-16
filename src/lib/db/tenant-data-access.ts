import { prisma } from "./client";
import { TenantContext } from "../types";

export class TenantDataAccess {
  constructor(private readonly ctx: TenantContext) {
    if (!ctx || !ctx.tenantId) {
      throw new Error("TenantDataAccess instantiated without valid TenantContext");
    }
  }

  // Example base method - all methods MUST use this.ctx.tenantId in exactly this way
  async getProjectById(projectId: string) {
    return prisma.project.findFirst({
      where: {
        id: projectId,
        tenant_id: this.ctx.tenantId, // Strict isolation
      },
    });
  }

  async getProjects() {
    return prisma.project.findMany({
      where: { tenant_id: this.ctx.tenantId },
      orderBy: { created_at: 'desc' }
    });
  }

  async getJobById(jobId: string) {
    return prisma.job.findFirst({
      where: {
        id: jobId,
        tenant_id: this.ctx.tenantId, // Strict isolation
      },
    });
  }

  async getScenariosByJob(jobId: string) {
    return prisma.scenario.findMany({
      where: {
        job_id: jobId,
        tenant_id: this.ctx.tenantId,
      },
    });
  }

  async getFinancialsByJob(jobId: string) {
    return prisma.financialResult.findMany({
      where: {
        job_id: jobId,
        tenant_id: this.ctx.tenantId,
      },
    });
  }

  async getReportByJob(jobId: string) {
    return prisma.report.findFirst({
      where: {
        job_id: jobId,
        tenant_id: this.ctx.tenantId,
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getAuditLogsByJob(jobId: string) {
    return prisma.auditLog.findMany({
      where: {
        job_id: jobId,
        tenant_id: this.ctx.tenantId,
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getProcessGraphByJob(jobId: string) {
    return prisma.processGraph.findFirst({
      where: {
        job_id: jobId,
        tenant_id: this.ctx.tenantId,
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getDiagnosticsByJob(jobId: string) {
    return prisma.diagnosticResult.findFirst({
      where: {
        job_id: jobId,
        tenant_id: this.ctx.tenantId,
      },
      orderBy: { created_at: 'desc' }
    });
  }
}

