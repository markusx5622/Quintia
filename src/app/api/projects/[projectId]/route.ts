import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/services/tenant-context-resolver";
import { TenantDataAccess } from "@/lib/db/tenant-data-access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const ctx = await resolveTenantContext();
    const resolvedParams = await params;
    const dataAccess = new TenantDataAccess(ctx);
    const project = await dataAccess.getProjectById(resolvedParams.projectId);
    
    if (!project) {
      return NextResponse.json({ error: "Project not found or accessible" }, { status: 404 });
    }

    return NextResponse.json(project);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}
