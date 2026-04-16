// Note: Law 4 enforcement by schema-exclusion. 
// None of these types contain financial variables (ROI, savings, payback).

export interface OntologyEntity {
  id: string;
  name: string;
  type: "role" | "resource" | "system" | "document" | "kpi" | "event" | "other";
  description: string;
}

export interface OntologyOutput {
  entities: OntologyEntity[];
  relationships: { sourceId: string; targetId: string; type: string; description?: string }[];
  key_performace_indicators: string[];
}

export interface ProcessGraphOutput {
  // We re-export the canonical graph layout from graph.ts, 
  // but this is the raw unstructured nodes extracted by the agent.
  raw_nodes: { id: string; label: string; action: string; role: string; system?: string }[];
  raw_edges: { source: string; target: string; condition?: string }[];
}

export interface DiagnosticIssue {
  id: string;
  nodeIds: string[]; // affected nodes
  severity: "low" | "medium" | "high" | "critical";
  category: "bottleneck" | "redundancy" | "compliance" | "data_silo" | "manual_work";
  description: string;
  evidence: string;
}

export interface DiagnosticsOutput {
  issues: DiagnosticIssue[];
  overall_health_score: number; // 0-100
}

export interface ScenarioAssumption {
  id: string;
  description: string;
  parameter_name: string;
  parameter_value_estimate: string | number; 
}

export interface ImprovementLever {
  id: string;
  action_type: "automation" | "elimination" | "parallelization" | "outsourcing" | "optimization";
  description: string;
}

export interface ScenarioCandidate {
  id: string; // Will map to Scenario DB table
  name: string;
  description: string;
  target_process_node_ids: string[];
  improvement_type: "automation" | "elimination" | "parallelization" | "outsourcing" | "optimization";
  assumptions: ScenarioAssumption[];
  levers: ImprovementLever[];
  // EXPLICIT OMISSION: NO roi, savings, or payback metrics here! Law 4 compliant.
}

export interface ScenariosOutput {
  scenario_candidates: ScenarioCandidate[];
}

export interface CriticOutput {
  score: number; // 0-100
  issues: string[];
  validations: {
    rule: string;
    passed: boolean;
    details?: string;
  }[];
}

export interface FinancialResultReference {
  scenario_id: string;
  financial_result_id: string; // The UI will hydration this with the real result from the DB
  reference_context: string;
}

export interface ReportSection {
  title: string;
  content: string; // narrative text
}

export interface SynthesisOutput {
  executive_summary: string;
  sections: ReportSection[];
  recommendations: string[];
  financial_references: FinancialResultReference[]; // ONLY IDs allowed, no inline numbers!
}
