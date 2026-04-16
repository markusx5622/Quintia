import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PromptBuilder } from "../../services/prompt-builder";
import { IngestionService } from "../../services/ingestion";
import { prisma } from "../../db/client";

const TENANT_ID = "tenant_1";
const SAMPLE_NARRATIVE = `The procurement department receives purchase requests from multiple business units via email.
A procurement officer manually reviews each request and checks budget availability in the ERP system.
If approved, the officer creates a purchase order in the ERP and sends it to the supplier by email.
The supplier sends an invoice which is received by the accounts payable team, who manually enter it into
the accounting system. Payment is processed weekly in a batch run. The process involves high manual effort,
multiple system handoffs, and departments lack visibility into request status.`;

describe("PromptBuilder — Slice 7 hydration tests", () => {
  let jobId: string;

  beforeEach(async () => {
    await prisma.financialResult.deleteMany();
    await prisma.scenario.deleteMany();
    await prisma.diagnosticResult.deleteMany();
    await prisma.processGraph.deleteMany();
    await prisma.ontologyResult.deleteMany();
    await prisma.report.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.job.deleteMany();
    await prisma.rawInput.deleteMany();
    await prisma.project.deleteMany();
    await prisma.tenant.deleteMany();

    await prisma.tenant.create({ data: { id: TENANT_ID, name: "Test Tenant", slug: "test-tenant" } });
    const { job } = await IngestionService.ingestNarrative(TENANT_ID, SAMPLE_NARRATIVE, "Procurement Test");
    jobId = job.id;
  });

  afterAll(() => prisma.$disconnect());

  it("Agent 1 system prompt contains exact role and forbidden behavior clauses", async () => {
    const { system, user } = await PromptBuilder.agent1_ontology(jobId);

    expect(system).toContain("enterprise ontology architect");
    expect(system).toContain("FORBIDDEN");
    expect(system).toContain("financial quantities");
    expect(system).toContain("OUTPUT CONTRACT");
    expect(user).toContain(SAMPLE_NARRATIVE.slice(0, 50));
  });

  it("Agent 2 injection contains full OntologyResult JSON and truncated narrative", async () => {
    // Seed an OntologyResult first
    const fakeOntology = {
      entities: [{ id: "e-1", name: "Procurement Officer", type: "role", description: "Reviews requests" }],
      relationships: [],
      key_performace_indicators: ["approval_time"]
    };
    await prisma.ontologyResult.create({
      data: { tenant_id: TENANT_ID, project_id: (await prisma.job.findUnique({ where: { id: jobId }, select: { project_id: true } }))!.project_id, job_id: jobId, data: JSON.stringify(fakeOntology) }
    });

    const { system, user } = await PromptBuilder.agent2_processGraph(jobId);

    expect(system).toContain("pn-");
    expect(system).toContain("FORBIDDEN");
    expect(user).toContain("Procurement Officer");
    expect(user).toContain("VALIDATED ONTOLOGY");
    expect(user).toContain("BUSINESS NARRATIVE");
  });

  it("Agent 4 system prompt contains explicit Law 4 forbidden field list", async () => {
    // Seed Ontology + Graph + Diagnostics to allow hydration
    const project_id = (await prisma.job.findUnique({ where: { id: jobId }, select: { project_id: true } }))!.project_id;
    await prisma.ontologyResult.create({ data: { tenant_id: TENANT_ID, project_id, job_id: jobId, data: JSON.stringify({ entities: [], relationships: [], key_performace_indicators: [] }) } });
    await prisma.processGraph.create({ data: { tenant_id: TENANT_ID, project_id, job_id: jobId, data: JSON.stringify({ raw_nodes: [{ id: "pn-1", label: "Review Request", action: "Review", role: "Procurement Officer" }], raw_edges: [] }) } });
    await prisma.diagnosticResult.create({ data: { tenant_id: TENANT_ID, project_id, job_id: jobId, data: JSON.stringify({ issues: [{ id: "d-1", nodeIds: ["pn-1"], severity: "high", category: "bottleneck", description: "Manual review bottleneck", evidence: "Single officer" }], overall_health_score: 45 }) } });

    const { system } = await PromptBuilder.agent4_scenarios(jobId);

    // These fields must all be explicitly forbidden in the Law 4 clause
    const law4Fields = ["roi", "return_on_investment", "net_savings", "annual_savings", "npv", "irr", "payback", "payback_period", "payback_months"];
    for (const field of law4Fields) {
      expect(system).toContain(field);
    }
    expect(system).toContain("LAW 4 (ABSOLUTE)");
    expect(system).toContain("deterministic engine");
  });

  it("Agent 5 and 6 never receive actual financial figures", async () => {
    const project_id = (await prisma.job.findUnique({ where: { id: jobId }, select: { project_id: true } }))!.project_id;
    const scenario = await prisma.scenario.create({ data: { tenant_id: TENANT_ID, project_id, job_id: jobId, name: "Automate PO", description: "desc", target_process_node_ids: "[]", improvement_type: "automation", assumptions: "[]", levers: "[]", current_annual_cost: 150000, projected_annual_cost: 80000, implementation_cost: 30000 } });
    await prisma.financialResult.create({ data: { tenant_id: TENANT_ID, project_id, job_id: jobId, scenario_id: scenario.id, status: "computed", annual_savings: 70000, roi_percentage: 233, payback_months: 5.1, formula_version: "v1.0", input_basis: "{}" } });

    const { user: criticUser } = await PromptBuilder.agent5_critic(jobId);
    const { user: synthUser } = await PromptBuilder.agent6_synthesis(jobId);

    // Verify financial figures are NOT present in any injected prompt text
    const forbiddenFigures = ["70000", "233", "5.1", "150000", "80000", "30000"];
    for (const figure of forbiddenFigures) {
      expect(criticUser).not.toContain(figure);
      expect(synthUser).not.toContain(figure);
    }
    // but scenario IDs and status ARE present
    expect(criticUser).toContain(scenario.id);
    expect(synthUser).toContain("computed");
  });
});
