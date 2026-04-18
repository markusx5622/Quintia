import { Job } from "@prisma/client";
import { prisma } from "../db/client";
import { AgentExecutor } from "./agent-executor";
import { 
  ontologyOutputSchema, 
  processGraphOutputSchema, 
  diagnosticsOutputSchema, 
  scenariosOutputSchemaStrict,
  criticOutputSchema 
} from "../agents/contracts";
import { FinancialEngine } from "./financial-engine";
import { ReportGenerator } from "./report-generator";
import { PromptBuilder } from "./prompt-builder";
import { AuditService, AuditEventType } from "./audit-service";

export class PipelineEscalationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PipelineEscalationError";
  }
}

export class PipelineOrchestrator {
  private static readonly MAX_RETRIES = 2;

  /**
   * Run exactly one stage of the pipeline.
   * This is the granular execution unit for Inngest or background workers.
   */
  static async runStage(jobId: string, stageName: string, userPromptSuffix: string = ""): Promise<Job> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Job not found");

    // Track that the stage has started
    await AuditService.log({
      tenantId: job.tenant_id,
      jobId: job.id,
      eventType: AuditEventType.STAGE_STARTED,
      stage: stageName,
      details: { message: `Engine version: Gemini Multi-Layer Throttling + Jitter` }
    });

    try {
      // Logic for each stage
      switch (stageName) {
        case "ontology":
          return await this.executeOntology(job, userPromptSuffix);
        case "process_graph":
          return await this.executeProcessGraph(job, userPromptSuffix);
        case "diagnostics":
          return await this.executeDiagnostics(job, userPromptSuffix);
        case "scenarios":
          return await this.executeScenarios(job, userPromptSuffix);
        case "recalculation":
          return await this.executeRecalculation(job);
        case "critic":
          return await this.executeCritic(job, userPromptSuffix);
        case "synthesis":
          return await this.executeSynthesis(job);
        default:
          throw new Error(`Unknown stage: ${stageName}`);
      }
    } catch (error: any) {
      await AuditService.log({
        tenantId: job.tenant_id,
        jobId: job.id,
        eventType: AuditEventType.STAGE_FAILED,
        stage: stageName,
        severity: "error",
        details: { error: error.message, stack: error.stack }
      });
      throw error; // Re-throw for Inngest retry logic
    }
  }

  private static async executeOntology(job: Job, userPromptSuffix: string): Promise<Job> {
    let ontology = await prisma.ontologyResult.findFirst({ where: { job_id: job.id } });
    if (!ontology) {
      const { system, user } = await PromptBuilder.agent1_ontology(job.id);
      const out = await AgentExecutor.execute(system, user + userPromptSuffix, ontologyOutputSchema);
      ontology = await prisma.ontologyResult.create({
        data: { tenant_id: job.tenant_id, project_id: job.project_id, job_id: job.id, data: JSON.stringify(out) }
      });
    }
    await AuditService.log({
      tenantId: job.tenant_id, jobId: job.id, eventType: AuditEventType.STAGE_COMPLETED, stage: "ontology",
      details: { resultId: ontology.id }
    });
    return this.advanceStage(job.id, "process_graph");
  }

  private static async executeProcessGraph(job: Job, userPromptSuffix: string): Promise<Job> {
    let graph = await prisma.processGraph.findFirst({ where: { job_id: job.id } });
    if (!graph) {
      const { system, user } = await PromptBuilder.agent2_processGraph(job.id);
      const out = await AgentExecutor.execute(system, user + userPromptSuffix, processGraphOutputSchema);
      graph = await prisma.processGraph.create({
        data: { tenant_id: job.tenant_id, project_id: job.project_id, job_id: job.id, data: JSON.stringify(out) }
      });
    }
    await AuditService.log({
      tenantId: job.tenant_id, jobId: job.id, eventType: AuditEventType.STAGE_COMPLETED, stage: "process_graph",
      details: { resultId: graph.id }
    });
    return this.advanceStage(job.id, "diagnostics");
  }

  private static async executeDiagnostics(job: Job, userPromptSuffix: string): Promise<Job> {
    let diag = await prisma.diagnosticResult.findFirst({ where: { job_id: job.id } });
    if (!diag) {
      const { system, user } = await PromptBuilder.agent3_diagnostics(job.id);
      const out = await AgentExecutor.execute(system, user + userPromptSuffix, diagnosticsOutputSchema);
      diag = await prisma.diagnosticResult.create({
        data: { tenant_id: job.tenant_id, project_id: job.project_id, job_id: job.id, data: JSON.stringify(out) }
      });
    }
    await AuditService.log({
      tenantId: job.tenant_id, jobId: job.id, eventType: AuditEventType.STAGE_COMPLETED, stage: "diagnostics",
      details: { resultId: diag.id }
    });
    return this.advanceStage(job.id, "scenarios");
  }

  private static async executeScenarios(job: Job, userPromptSuffix: string): Promise<Job> {
    let scenarios = await prisma.scenario.findMany({ where: { job_id: job.id } });
    if (scenarios.length === 0) {
      const { system, user } = await PromptBuilder.agent4_scenarios(job.id);
      const out = await AgentExecutor.execute(system, user + userPromptSuffix, scenariosOutputSchemaStrict);
      
      for (const candidate of out.scenario_candidates) {
        const projected = candidate.assumptions.find(a => a.parameter_name === "projected_annual_cost")?.parameter_value_estimate || 0;
        const current = candidate.assumptions.find(a => a.parameter_name === "current_annual_cost")?.parameter_value_estimate || 0;
        const implementation = candidate.assumptions.find(a => a.parameter_name === "implementation_cost")?.parameter_value_estimate || 0;

        await prisma.scenario.create({
          data: {
            tenant_id: job.tenant_id, project_id: job.project_id, job_id: job.id,
            name: candidate.name,
            description: candidate.description,
            target_process_node_ids: JSON.stringify(candidate.target_process_node_ids),
            improvement_type: candidate.improvement_type,
            assumptions: JSON.stringify(candidate.assumptions),
            levers: JSON.stringify(candidate.levers),
            current_annual_cost: Number(current),
            projected_annual_cost: Number(projected),
            implementation_cost: Number(implementation)
          }
        });
      }
      scenarios = await prisma.scenario.findMany({ where: { job_id: job.id } });
    }
    await AuditService.log({
      tenantId: job.tenant_id, jobId: job.id, eventType: AuditEventType.STAGE_COMPLETED, stage: "scenarios",
      details: { scenarioCount: scenarios.length }
    });
    return this.advanceStage(job.id, "recalculation");
  }

  private static async executeRecalculation(job: Job): Promise<Job> {
    const scenarios = await prisma.scenario.findMany({ where: { job_id: job.id } });
    for (const scen of scenarios) {
      const existing = await prisma.financialResult.findFirst({ where: { scenario_id: scen.id } });
      if (existing) continue;

      const result = FinancialEngine.calculateFinancials({
        scenario_id: scen.id,
        current_annual_cost: scen.current_annual_cost,
        projected_annual_cost: scen.projected_annual_cost,
        implementation_cost: scen.implementation_cost,
        additional_annual_benefits: scen.additional_annual_benefits
      });
      await prisma.financialResult.create({
        data: {
          tenant_id: job.tenant_id, project_id: job.project_id, job_id: job.id, scenario_id: scen.id,
          status: result.status,
          annual_savings: result.annual_savings,
          roi_percentage: result.roi_percentage,
          payback_months: result.payback_months,
          formula_version: result.formula_version,
          input_basis: JSON.stringify(result.input_basis),
          status_reason: result.status_reason
        }
      });
      await AuditService.log({
        tenantId: job.tenant_id, jobId: job.id, eventType: AuditEventType.FINANCIAL_CALCULATED, stage: "recalculation",
        details: { scenarioId: scen.id, annualSavings: result.annual_savings }
      });
    }
    return this.advanceStage(job.id, "critic");
  }

  private static async executeCritic(job: Job, userPromptSuffix: string): Promise<Job> {
    const { system, user } = await PromptBuilder.agent5_critic(job.id);
    const out = await AgentExecutor.execute(system, user + userPromptSuffix, criticOutputSchema);
    await prisma.job.update({
      where: { id: job.id },
      data: { validation_results: JSON.stringify(out) }
    });
    await AuditService.log({
      tenantId: job.tenant_id, jobId: job.id, eventType: AuditEventType.STAGE_COMPLETED, stage: "critic",
      details: { feedbackScore: out.score }
    });
    return this.advanceStage(job.id, "synthesis");
  }

  private static async executeSynthesis(job: Job): Promise<Job> {
    await ReportGenerator.executeSynthesis(job.id, job.tenant_id, job.project_id);
    const updatedJob = await prisma.job.update({
      where: { id: job.id },
      data: { status: "completed", current_stage: "done", completed_at: new Date(), locked_until: null, locked_by: null }
    });
    await AuditService.log({
      tenantId: job.tenant_id, jobId: job.id, eventType: AuditEventType.STAGE_COMPLETED, stage: "synthesis",
      details: { message: "Pipeline completed successfully" }
    });
    return updatedJob;
  }

  /**
   * Legacy method maintained for backward compatibility, now just runs until end.
   */
  static async executeJob(jobId: string, userPromptSuffix: string = ""): Promise<Job> {
    let job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Job not found");

    if (job.status === "completed") return job;

    try {
      while (job.current_stage !== "done" && job.status !== "completed") {
        job = await this.runStage(jobId, job.current_stage, userPromptSuffix);
      }
      return job;
    } catch (error: any) {
      return this.handleStageFailure(jobId, error.message || "Unknown error");
    }
  }

  static async handleStageFailure(jobId: string, errorMsg: string): Promise<Job> {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new Error("Job not found");

    if (job.retry_count >= this.MAX_RETRIES) {
      const escalatedJob = await prisma.job.update({
        where: { id: jobId },
        data: {
          status: "escalated",
          error_message: `Escalated after ${this.MAX_RETRIES} retries. Last error: ${errorMsg}`
        }
      });
      await AuditService.log({
        tenantId: escalatedJob.tenant_id, jobId, eventType: AuditEventType.ESCALATION,
        stage: escalatedJob.current_stage, severity: "critical", details: { reason: errorMsg }
      });
      return escalatedJob;
    }

    return prisma.job.update({
      where: { id: jobId },
      data: {
        status: "pending",
        retry_count: { increment: 1 },
        error_message: errorMsg,
        locked_until: new Date(Date.now() + 10000 * Math.pow(2, job.retry_count))
      }
    });
  }

  static async advanceStage(jobId: string, nextStage: string): Promise<Job> {
    return prisma.job.update({
      where: { id: jobId },
      data: { current_stage: nextStage, error_message: null }
    });
  }
}
