import { prisma } from "../db/client";
import { synthesisOutputSchema } from "../agents/contracts";
import { AgentExecutor } from "./agent-executor";
import { PromptBuilder } from "./prompt-builder";

export class ReportGenerator {
  /**
   * Stage 7: Generates executive synthesis from validated outputs.
   * Context is hydrated by PromptBuilder — Law 4 compliance enforced via schema.
   */
  static async executeSynthesis(jobId: string, tenantId: string, projectId: string) {
    const { system, user } = await PromptBuilder.agent6_synthesis(jobId);
    
    const synthesisData = await AgentExecutor.execute(
      system,
      user,
      synthesisOutputSchema
    );

    const report = await prisma.report.create({
      data: {
        tenant_id: tenantId,
        project_id: projectId,
        job_id: jobId,
        data: JSON.stringify(synthesisData),
        status: "final"
      }
    });

    return report;
  }
}
