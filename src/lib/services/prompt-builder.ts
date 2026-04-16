import { prisma } from "../db/client";

/**
 * PromptBuilder — Slice 7
 *
 * Owns per-agent context hydration.
 * Enforces selective field injection: only the minimum validated fields
 * required for each agent's task are included.
 *
 * Token discipline rules:
 * - Raw narrative truncated to 3000 chars for Agent 2+
 * - ProcessGraph nodes capped at 50 (compact shape only)
 * - ProcessGraph edges capped at 50 (source/target only)
 * - Diagnostic issues capped at 20 (compact shape only)
 * - FinancialResults: ID + status only (no figures) — Law 4 compliance
 */

const NARRATIVE_TRUNCATION_LIMIT = 3000;
const MAX_NODES = 50;
const MAX_EDGES = 50;
const MAX_ISSUES = 20;
const MAX_SCENARIOS_FOR_CRITIC = 10;

// ─── Compact Shapes ───────────────────────────────────────────────────────────

interface CompactNode { id: string; label: string; role: string; system?: string }
interface CompactEdge { source: string; target: string }
interface CompactIssue { id: string; severity: string; category: string; nodeIds: string[] }
interface CompactFinancial { id: string; scenario_id: string; status: string }

// ─── Fetchers with strict field selection ─────────────────────────────────────

async function fetchRawInput(jobId: string): Promise<string> {
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { project_id: true } });
  if (!job) throw new Error(`Job ${jobId} not found`);
  const input = await prisma.rawInput.findFirst({
    where: { project_id: job.project_id },
    select: { content: true }
  });
  return input?.content ?? "";
}

async function fetchOntology(jobId: string): Promise<object | null> {
  const record = await prisma.ontologyResult.findFirst({
    where: { job_id: jobId },
    select: { data: true },
    orderBy: { created_at: "desc" }
  });
  return record ? JSON.parse(record.data) : null;
}

async function fetchCompactGraph(jobId: string): Promise<{ nodes: CompactNode[]; edges: CompactEdge[] } | null> {
  const record = await prisma.processGraph.findFirst({
    where: { job_id: jobId },
    select: { data: true },
    orderBy: { created_at: "desc" }
  });
  if (!record) return null;
  const parsed = JSON.parse(record.data) as { raw_nodes: any[]; raw_edges: any[] };
  return {
    nodes: parsed.raw_nodes
      .slice(0, MAX_NODES)
      .map(n => ({ id: n.id, label: n.label, role: n.role, ...(n.system ? { system: n.system } : {}) })),
    edges: parsed.raw_edges
      .slice(0, MAX_EDGES)
      .map(e => ({ source: e.source, target: e.target }))
  };
}

async function fetchCompactDiagnostics(jobId: string): Promise<{ issues: CompactIssue[]; health_score: number } | null> {
  const record = await prisma.diagnosticResult.findFirst({
    where: { job_id: jobId },
    select: { data: true },
    orderBy: { created_at: "desc" }
  });
  if (!record) return null;
  const parsed = JSON.parse(record.data) as { issues: any[]; overall_health_score: number };
  return {
    issues: parsed.issues
      .slice(0, MAX_ISSUES)
      .map(i => ({ id: i.id, severity: i.severity, category: i.category, nodeIds: i.nodeIds })),
    health_score: parsed.overall_health_score
  };
}

async function fetchScenarioSummaries(jobId: string): Promise<{ id: string; name: string; assumption_params: string[] }[]> {
  const scenarios = await prisma.scenario.findMany({
    where: { job_id: jobId },
    select: { id: true, name: true, assumptions: true },
    take: MAX_SCENARIOS_FOR_CRITIC
  });
  return scenarios.map(s => ({
    id: s.id,
    name: s.name,
    assumption_params: (JSON.parse(s.assumptions) as any[]).map(a => a.parameter_name)
  }));
}

async function fetchFinancialSummaries(jobId: string): Promise<CompactFinancial[]> {
  // Law 4: only ID, scenario_id, status — never actual figures
  const results = await prisma.financialResult.findMany({
    where: { job_id: jobId },
    select: { id: true, scenario_id: true, status: true }
  });
  return results.map(r => ({ id: r.id, scenario_id: r.scenario_id, status: r.status }));
}

// ─── Public builder entrypoints ───────────────────────────────────────────────

export const PromptBuilder = {

  /**
   * Agent 1 — Ontology Extractor
   * Input: raw narrative (full)
   */
  async agent1_ontology(jobId: string): Promise<{ system: string; user: string }> {
    const narrative = await fetchRawInput(jobId);

    const system = `You are an enterprise ontology architect operating within the QUINTIA process intelligence platform.
ROLE: Extract a canonical ontology from an unstructured business process narrative.
TASK: Identify all distinct entities (roles, systems, documents, events, KPIs) and their relationships as evidenced in the text. Do not infer entities beyond what the text directly supports.
FORBIDDEN:
- Describing process steps or sequences (that is the Process Architect's domain).
- Generating any financial quantities, costs, or savings.
- Inventing entities not present in the text.
OUTPUT CONTRACT: Return a single JSON object matching this schema exactly:
{ entities: [{id, name, type, description}], relationships: [{sourceId, targetId, type, description}], key_performace_indicators: [string] }
Valid entity types: role | resource | system | document | kpi | event | other
Return ONLY the JSON object. No markdown, no prose, no commentary.`;

    const user = `Extract the ontology from the following business process narrative:\n\n${narrative}`;

    return { system, user };
  },

  /**
   * Agent 2 — Process Architect
   * Inputs: validated ontology (full JSON) + narrative (truncated)
   */
  async agent2_processGraph(jobId: string): Promise<{ system: string; user: string }> {
    const narrative = await fetchRawInput(jobId);
    const ontology = await fetchOntology(jobId);
    if (!ontology) throw new Error("Ontology not found for Agent 2 — cannot proceed without prior stage.");

    const truncatedNarrative = narrative.length > NARRATIVE_TRUNCATION_LIMIT
      ? narrative.slice(0, NARRATIVE_TRUNCATION_LIMIT) + "\n[...truncated]"
      : narrative;

    const system = `You are an industrial process graph engineer operating within the QUINTIA process intelligence platform.
ROLE: Construct a directed process flow graph from a validated ontology and a business narrative.
TASK: Map the narrative's process sequence into discrete, connected nodes and directed edges. Every node must be anchored to entities that exist in the provided ontology. Node IDs must be prefixed with "pn-".
FORBIDDEN:
- Creating nodes for entities absent in the provided ontology.
- Evaluating process quality, efficiency, or bottlenecks (that is the Diagnostician's domain).
- Adding financial quantities or cost estimates.
- Inventing edges or sequences not evidenced in the narrative.
OUTPUT CONTRACT: Return a single JSON object:
{ raw_nodes: [{id, label, action, role, system?}], raw_edges: [{source, target, condition?}] }
Return ONLY the JSON object. No markdown, no prose.`;

    const user = `VALIDATED ONTOLOGY (JSON):
${JSON.stringify(ontology)}

BUSINESS NARRATIVE (may be truncated):
${truncatedNarrative}

Construct the process graph.`;

    return { system, user };
  },

  /**
   * Agent 3 — Industrial Diagnostician
   * Input: compact graph (nodes id/label/role/system + edges source/target only)
   */
  async agent3_diagnostics(jobId: string): Promise<{ system: string; user: string }> {
    const graph = await fetchCompactGraph(jobId);
    if (!graph) throw new Error("ProcessGraph not found for Agent 3.");

    const nodeCount = graph.nodes.length;
    const edgeCount = graph.edges.length;
    const headerNote = nodeCount >= MAX_NODES
      ? `[Graph truncated to first ${MAX_NODES} nodes of a larger graph]`
      : "";

    const system = `You are an operational process analyst operating within the QUINTIA process intelligence platform.
ROLE: Identify structural issues in a process graph based on its topology and role/system assignments.
TASK: Diagnose bottlenecks, redundancies, manual work concentrations, data silos, and compliance risks. Base all findings strictly on the graph structure provided. Each issue must reference at least one valid node ID from the input.
FORBIDDEN:
- Fabricating issues not grounded in the graph topology.
- Speculating about root causes beyond the graph evidence.
- Any financial estimation or cost quantification.
OUTPUT CONTRACT: Return a single JSON object:
{ issues: [{id, nodeIds, severity, category, description, evidence}], overall_health_score: number (0-100) }
Valid severity values: low | medium | high | critical
Valid category values: bottleneck | redundancy | compliance | data_silo | manual_work
issue.nodeIds must only contain IDs present in the provided node list.
Return ONLY the JSON object. No markdown, no prose.`;

    const user = `PROCESS GRAPH SUMMARY (${nodeCount} nodes, ${edgeCount} edges):${headerNote}

NODES:
${JSON.stringify(graph.nodes)}

EDGES:
${JSON.stringify(graph.edges)}

Identify all structural process issues.`;

    return { system, user };
  },

  /**
   * Agent 4 — Financial Simulator
   * Inputs: compact diagnostic issues (no evidence text) + compact node labels
   */
  async agent4_scenarios(jobId: string): Promise<{ system: string; user: string }> {
    const diagnostics = await fetchCompactDiagnostics(jobId);
    if (!diagnostics) throw new Error("DiagnosticResult not found for Agent 4.");

    const graph = await fetchCompactGraph(jobId);
    const nodeLabelMap = graph
      ? graph.nodes.map(n => `${n.id}: ${n.label} (${n.role})`).join("\n")
      : "(graph unavailable)";

    const system = `You are an operational cost assumption modeller operating within the QUINTIA process intelligence platform.
ROLE: Propose structured improvement scenario candidates with cost assumption parameters.
TASK: For each significant diagnostic issue, propose one or more scenario candidates. Each scenario must define cost assumptions as structured parameter objects with the parameter_name strings: "current_annual_cost", "projected_annual_cost", "implementation_cost". Provide only these as numeric estimates.
FORBIDDEN — LAW 4 (ABSOLUTE):
- You MUST NOT compute, derive, or output any of the following: roi, return_on_investment, net_savings, annual_savings, npv, irr, payback, payback_period, payback_months, or any equivalent field.
- These are computed exclusively by a deterministic engine after you respond. Any such key in your output will cause an immediate validation failure.
- You model assumptions. You do NOT compute outcomes.
OUTPUT CONTRACT: Return a single JSON object matching this schema:
{ scenario_candidates: [{id, name, description, target_process_node_ids, improvement_type, assumptions: [{id, description, parameter_name, parameter_value_estimate}], levers: [{id, action_type, description}]}] }
Valid improvement_type values: automation | elimination | parallelization | outsourcing | optimization
Return ONLY the JSON object. No markdown, no prose, no extra keys beyond those listed.`;

    const user = `DIAGNOSTIC ISSUES (${diagnostics.issues.length} total, compact form):
${JSON.stringify(diagnostics.issues)}

PROCESS NODES FOR REFERENCE:
${nodeLabelMap}

HEALTH SCORE: ${diagnostics.health_score}/100

Propose improvement scenario candidates with cost assumptions only.`;

    return { system, user };
  },

  /**
   * Agent 5 — Consistency Critic
   * Inputs: scenario assumption param names + financial status refs (IDs only, no figures)
   */
  async agent5_critic(jobId: string): Promise<{ system: string; user: string }> {
    const scenarios = await fetchScenarioSummaries(jobId);
    const financials = await fetchFinancialSummaries(jobId);

    const system = `You are a pipeline audit validator operating within the QUINTIA process intelligence platform.
ROLE: Validate the coherence and integrity of the outputs produced by the preceding pipeline stages.
TASK: For each validation rule below, determine if it PASSED or FAILED, and provide a concise justification.
Validation rules to check:
1. Each scenario references valid, expected assumption parameter names (current_annual_cost, projected_annual_cost, implementation_cost).
2. Each scenario has at least one financial_result record present with status "computed" or "insufficient_data".
3. No scenario contains any direct financial outcome fields (roi, savings, payback).
4. Scenario improvement_types are appropriate for the referenced issues.
5. Overall pipeline produced at least one valid scenario candidate.
FORBIDDEN:
- Generating new data, scenarios, or findings.
- Modifying or overwriting prior-stage outputs.
- Quoting any specific financial figures (costs, savings, ROI).
OUTPUT CONTRACT: Return a single JSON object:
{ score: number (0-100), issues: [string], validations: [{rule: string, passed: boolean, details?: string}] }
Return ONLY the JSON object. No markdown, no prose.`;

    const user = `SCENARIO SUMMARIES (assumption parameter names only, no values):
${JSON.stringify(scenarios)}

FINANCIAL RESULT REFERENCES (IDs and computed status only — no figures):
${JSON.stringify(financials)}

Perform pipeline consistency validation.`;

    return { system, user };
  },

  /**
   * Agent 6 — Executive Synthesizer
   * Inputs: critic validations + scenario names/descriptions + financial result IDs (no figures)
   * Law 4: may reference results by ID only — must never state financial quantities
   */
  async agent6_synthesis(jobId: string): Promise<{ system: string; user: string }> {
    const scenarios = await fetchScenarioSummaries(jobId);
    const financials = await fetchFinancialSummaries(jobId);
    const diagnostics = await fetchCompactDiagnostics(jobId);

    const criticRecord = await prisma.job.findUnique({
      where: { id: jobId },
      select: { validation_results: true }
    });
    const criticSummary = criticRecord?.validation_results
      ? JSON.parse(criticRecord.validation_results)
      : null;

    const system = `You are a senior management report author operating within the QUINTIA process intelligence platform.
ROLE: Produce a structured, executive-grade process intelligence report based on validated pipeline outputs.
TASK: Synthesize a concise, factual, decision-ready report covering: current process state, identified issues, improvement scenarios, and a forward roadmap. Reference financial results by their ID only — you must never state, invent, or paraphrase specific financial figures, costs, ROI values, or savings amounts.
FORBIDDEN — ABSOLUTE:
- Stating any specific financial figure, cost, saving, ROI, or payback value. These are displayed to users directly from the deterministic financial engine only.
- Fabricating new findings, scenarios, or diagnoses not present in the verified inputs.
- Marketing prose. Be precise, factual, and direct.
- Inserting any key beyond the output contract schema.
OUTPUT CONTRACT: Return a single JSON object:
{ executive_summary: string, sections: [{title: string, content: string}], recommendations: [string], financial_references: [{scenario_id: string, financial_result_id: string, reference_context: string}] }
financial_references.reference_context must be a neutral label like "See computed financial result" — never a financial statement.
Return ONLY the JSON object. No markdown, no prose outside the JSON.`;

    const healthNote = diagnostics ? `Process health score: ${diagnostics.health_score}/100` : "";
    const criticNote = criticSummary ? `Pipeline validation score: ${criticSummary.score}/100` : "";

    const user = `SCENARIO DESCRIPTIONS:
${JSON.stringify(scenarios.map(s => ({ id: s.id, name: s.name })))}

FINANCIAL RESULT REFERENCES (IDs and status only — do not quote any figures):
${JSON.stringify(financials)}

${healthNote}
${criticNote}

Produce the executive synthesis report.`;

    return { system, user };
  }
};
