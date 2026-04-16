import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/services/tenant-context-resolver";
import { TenantDataAccess } from "@/lib/db/tenant-data-access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const ctx = await resolveTenantContext();
    const resolvedParams = await params;
    const dataAccess = new TenantDataAccess(ctx);
    
    const job = await dataAccess.getJobById(resolvedParams.jobId);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Strip sensitive raw data if any, return operational state
    return NextResponse.json({
      id: job.id,
      project_id: job.project_id,
      current_stage: job.current_stage,
      status: job.status,
      retry_count: job.retry_count,
      error_message: job.error_message,
      updated_at: job.updated_at
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
