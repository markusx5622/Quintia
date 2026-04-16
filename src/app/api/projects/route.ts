import { NextResponse } from "next/server";
import { resolveTenantContext } from "@/lib/services/tenant-context-resolver";
import { TenantDataAccess } from "@/lib/db/tenant-data-access";
import { IngestionService } from "@/lib/services/ingestion";

export async function GET() {
  try {
    const ctx = await resolveTenantContext();
    const dataAccess = new TenantDataAccess(ctx);
    const projects = await dataAccess.getProjects();
    return NextResponse.json(projects);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await resolveTenantContext();
    const body = await request.json();
    const { name, narrativeText } = body;

    if (!name || !narrativeText) {
      return NextResponse.json({ error: "Missing name or narrativeText" }, { status: 400 });
    }

    const { project, job } = await IngestionService.ingestNarrative(ctx.tenantId, narrativeText, name);
    return NextResponse.json({ project, job });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
