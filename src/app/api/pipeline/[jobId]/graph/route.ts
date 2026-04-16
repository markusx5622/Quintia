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

    const graph = await dataAccess.getProcessGraphByJob(resolvedParams.jobId);
    return NextResponse.json(graph ? JSON.parse(graph.data) : null);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
