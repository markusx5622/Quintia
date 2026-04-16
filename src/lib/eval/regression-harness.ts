import { GoldenCase, EvalResult, EvaluationReport, FailureCategory } from "./types";
import { PromptBuilder } from "../services/prompt-builder";
import { AgentExecutor } from "../services/agent-executor";
import { ScoringModel } from "./scoring-model";
import { Law4Scanner } from "./law4-regression";
import * as contracts from "../agents/contracts";
import { prisma } from "../db/client";
import { IngestionService } from "../services/ingestion";

export class RegressionHarness {
  /**
   * Runs a full evaluation loop for a single Golden Case.
   */
  static async evaluateCase(golden: GoldenCase, tenantId: string): Promise<EvaluationReport> {
    const results: EvalResult[] = [];
    
    // 1. Ingest
    const { job } = await IngestionService.ingestNarrative(tenantId, golden.narrative, golden.name);
    const jobId = job.id;

    try {
      // --- STAGE 1: Ontology ---
      const res1 = await this.evalStage(jobId, 1, "Ontology", 
        PromptBuilder.agent1_ontology, 
        contracts.ontologyOutputSchema,
        (out) => ScoringModel.scoreAgent1(out, golden)
      );
      results.push(res1);
      if (res1.status === "fail") return this.packageReport(golden.id, results);
      await prisma.ontologyResult.create({ data: { tenant_id: tenantId, project_id: job.project_id, job_id: jobId, data: JSON.stringify(res1.rawOutput) } });

      // --- STAGE 2: Process Graph ---
      const res2 = await this.evalStage(jobId, 2, "ProcessGraph",
        PromptBuilder.agent2_processGraph,
        contracts.processGraphOutputSchema,
        (out) => ScoringModel.scoreAgent2(out, res1.rawOutput)
      );
      results.push(res2);
      if (res2.status === "fail") return this.packageReport(golden.id, results);
      await prisma.processGraph.create({ data: { tenant_id: tenantId, project_id: job.project_id, job_id: jobId, data: JSON.stringify(res2.rawOutput) } });

      // --- STAGE 3: Diagnostics ---
      const res3 = await this.evalStage(jobId, 3, "Diagnostics",
        PromptBuilder.agent3_diagnostics,
        contracts.diagnosticsOutputSchema,
        (out) => ScoringModel.scoreAgent3(out, res2.rawOutput, golden)
      );
      results.push(res3);
      if (res3.status === "fail") return this.packageReport(golden.id, results);
      await prisma.diagnosticResult.create({ data: { tenant_id: tenantId, project_id: job.project_id, job_id: jobId, data: JSON.stringify(res3.rawOutput) } });

      // --- STAGE 4: Scenarios ---
      const res4 = await this.evalStage(jobId, 4, "Scenarios",
        PromptBuilder.agent4_scenarios,
        contracts.scenariosOutputSchemaStrict,
        (out) => ScoringModel.scoreAgent4(out, res2.rawOutput)
      );
      results.push(res4);
      if (res4.status === "fail") return this.packageReport(golden.id, results);
      // Law 4 is already checked inside evalStage via scan()

      // ... Stages 5 & 6 omitted for brevity in demo, or can be added similarly ...
      // Let's add Stage 6 (Synthesis) as it's critical for Law 4 checks
      const res6 = await this.evalStage(jobId, 6, "Synthesis",
        PromptBuilder.agent6_synthesis,
        contracts.synthesisOutputSchema,
        (out) => ScoringModel.scoreAgent6(out)
      );
      results.push(res6);

    } catch (err: any) {
      console.error(`Evaluation crashed: ${err.message}`);
    }

    return this.packageReport(golden.id, results);
  }

  private static async evalStage(
    jobId: string, 
    agentId: number, 
    agentName: string,
    promptFn: (id: string) => Promise<{system: string, user: string}>,
    schema: any,
    scoreFn: (output: any) => any[]
  ): Promise<EvalResult> {
    const { system, user } = await promptFn(jobId);
    
    let rawOutput: any;
    let failureCategory: FailureCategory | undefined;
    
    try {
      rawOutput = await AgentExecutor.execute(system, user, schema);
    } catch (err: any) {
      // Classification: Schema Failure
      return {
        jobId, agentId, agentName, status: "fail",
        failureCategory: "schema",
        metrics: [{ name: "Schema Validation", score: 0, passed: false, details: err.message }],
        law4LeakageFound: false,
        rawOutput: null
      };
    }

    // Law 4 Deterministic Scan
    const { leakageFound, evidence } = Law4Scanner.scan(rawOutput);
    
    const metrics = scoreFn(rawOutput);
    const qualityPass = metrics.every(m => m.passed);
    const status = (qualityPass && !leakageFound) ? "pass" : "fail";
    
    if (leakageFound) failureCategory = "law4";
    else if (!qualityPass) failureCategory = "quality";

    return {
      jobId, agentId, agentName, status,
      failureCategory,
      metrics,
      law4LeakageFound: leakageFound,
      rawOutput
    };
  }

  private static packageReport(caseId: string, results: EvalResult[]): EvaluationReport {
    const passed = results.filter(r => r.status === "pass").length;
    return {
      timestamp: new Date().toISOString(),
      caseId,
      overallStatus: passed === results.length ? "pass" : "fail",
      agentResults: results,
      summary: {
        totalAgents: results.length,
        passedAgents: passed,
        failedAgents: results.length - passed
      }
    };
  }
}
