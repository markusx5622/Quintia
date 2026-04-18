import { NextResponse } from "next/server";
import { PipelineOrchestrator } from "@/lib/services/pipeline-orchestrator";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json({ error: "Missing jobId" }, { status: 400 });
  }

  try {
    console.log(`[Diag] Manually running ontology for job ${jobId}`);
    const result = await PipelineOrchestrator.runStage(jobId, "ontology");
    return NextResponse.json({ 
      success: true, 
      jobStatus: result.status,
      currentStage: result.current_stage
    });
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      stack: err.stack
    }, { status: 500 });
  }
}
