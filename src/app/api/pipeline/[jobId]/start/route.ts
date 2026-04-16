import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/services/tenant-context-resolver";
import { TenantDataAccess } from "@/lib/db/tenant-data-access";
import { AuditService, AuditEventType } from "@/lib/services/audit-service";
import { prisma } from "@/lib/db/client";
import { inngest } from "@/lib/inngest/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const ctx = await resolveTenantContext();
    const resolvedParams = await params;
    const { jobId } = resolvedParams;
    const dataAccess = new TenantDataAccess(ctx);
    
    const job = await dataAccess.getJobById(jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.status === "completed" || job.status === "escalated" || job.status === "failed") {
      return NextResponse.json({ error: "Job cannot be started from its current state" }, { status: 400 });
    }

    // Trigger Inngest Pipeline
    await inngest.send({
      name: "pipeline/job.started",
      data: { jobId }
    });

    // Update job status to show it's queued in the system
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "running", // Inngest will manage the "running" state
        current_stage: job.current_stage || "ontology",
        error_message: null
      }
    });

    // Persist start event
    await AuditService.log({
      tenantId: ctx.tenantId,
      jobId,
      eventType: AuditEventType.STAGE_STARTED,
      stage: "pipeline_triggered",
      severity: "info",
      details: { message: "Pipeline execution triggered via Inngest" }
    });

    return NextResponse.json({ message: "Pipeline triggered via Inngest", jobId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
