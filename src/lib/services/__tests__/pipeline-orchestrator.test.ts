import { describe, it, expect, beforeEach } from "vitest";
import { PipelineOrchestrator } from "../pipeline-orchestrator";
import { IngestionService } from "../ingestion";
import { prisma } from "../../db/client";

describe("PipelineOrchestrator Slice 2 e2e", () => {
  beforeEach(async () => {
    await prisma.financialResult.deleteMany({});
    await prisma.scenario.deleteMany({});
    await prisma.diagnosticResult.deleteMany({});
    await prisma.processGraph.deleteMany({});
    await prisma.ontologyResult.deleteMany({});
    await prisma.report.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.rawInput.deleteMany({});
    await prisma.job.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.tenant.deleteMany({});

    await prisma.tenant.create({
      data: { id: "tenant_1", name: "Test Tenant", slug: "test_tenant" }
    });
  });

  it("executes the full 7-stage happy path natively", async () => {
    const { job } = await IngestionService.ingestNarrative("tenant_1", "The procurement team manually processes all purchase requests via email with no automation.", "Mock Project");
    
    expect(job.current_stage).toBe("ontology");
    expect(job.status).toBe("pending");

    // We manually advance stages in the test to simulate the orchestrator loop
    // or just call executeJob iteratively until done or it resolves everything in one loop.
    // In our implementation, executeJob advances stage and returns the job, so it just does one stage.
    // Wait, executeJob in my implementation currently does:
    // if stage == ontology -> execute -> advanceStage. Then the next 'if' is NOT 'else if', so it will cascade!
    // Yes, the implementation cascades through all stages synchronously if no error is thrown!
    
    // Execute the full pipeline
    const completedJob = await PipelineOrchestrator.executeJob(job.id);
    
    expect(completedJob.status).toBe("completed");
    expect(completedJob.current_stage).toBe("done");

    // Verify deterministic recalculation happened
    const financials = await prisma.financialResult.findMany({ where: { job_id: job.id }});
    expect(financials.length).toBeGreaterThan(0);
    expect(financials[0].annual_savings).toBe(50000); // 100k - 50k + 0
    // Actually mock output: current_annual_cost: 100000, projected_annual_cost: 50000 -> Savings 50000.
  });

  it("halts, retries, and escalates on Law 4 violation", async () => {
    const { job, project } = await IngestionService.ingestNarrative("tenant_1", "The procurement team manually processes all purchase requests via email with no automation.", "Law 4 Project");
    
    // Seed prior-stage artifacts so PromptBuilder.agent4_scenarios can hydrate without error
    await prisma.ontologyResult.create({ data: { tenant_id: "tenant_1", project_id: project.id, job_id: job.id, data: JSON.stringify({ entities: [], relationships: [], key_performace_indicators: [] }) } });
    await prisma.processGraph.create({ data: { tenant_id: "tenant_1", project_id: project.id, job_id: job.id, data: JSON.stringify({ raw_nodes: [{ id: "pn-1", label: "Review", action: "Review", role: "Officer" }], raw_edges: [] }) } });
    await prisma.diagnosticResult.create({ data: { tenant_id: "tenant_1", project_id: project.id, job_id: job.id, data: JSON.stringify({ issues: [{ id: "d-1", nodeIds: ["pn-1"], severity: "high", category: "bottleneck", description: "Manual bottleneck", evidence: "Single point" }], overall_health_score: 40 }) } });

    // Advance job to scenarios stage to simulate breaking exclusively there
    await PipelineOrchestrator.advanceStage(job.id, "scenarios");

    // 1st Execution: Agent throws Law 4 violation
    const retry1 = await PipelineOrchestrator.executeJob(job.id, "MALFORMED_LAW4");
    expect(retry1.retry_count).toBe(1);
    expect(retry1.status).toBe("pending");
    expect(retry1.error_message).toContain("Law 4 Violation Detected");

    // 2nd Execution: Agent throws again
    const retry2 = await PipelineOrchestrator.executeJob(job.id, "MALFORMED_LAW4");
    expect(retry2.retry_count).toBe(2);

    // 3rd Execution: Max retries hit, MUST ESCALATE
    const escalated = await PipelineOrchestrator.executeJob(job.id, "MALFORMED_LAW4");
    expect(escalated.status).toBe("escalated");
    
    // Verify an audit log was generated
    const logs = await prisma.auditLog.findMany({ where: { job_id: job.id, event_type: "escalation" }});
    expect(logs.length).toBe(1);
    expect(logs[0].severity).toBe("critical");
  });
});
