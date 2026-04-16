/**
 * Slice 8 — Evaluation Types
 */

export interface GoldenCase {
  id: string;
  name: string;
  narrative: string;
  expected_entities: string[];
  expected_bottleneck_keywords: string[];
  expected_improvement_types: string[];
}

export type FailureCategory = "schema" | "logic" | "quality" | "law4";

export interface QualityMetric {
  name: string;
  score: number; // 0-100
  passed: boolean;
  details?: string;
}

export interface EvalResult {
  jobId: string;
  agentId: number;
  agentName: string;
  status: "pass" | "fail";
  failureCategory?: FailureCategory;
  metrics: QualityMetric[];
  law4LeakageFound: boolean;
  rawOutput: any;
}

export interface EvaluationReport {
  timestamp: string;
  caseId: string;
  overallStatus: "pass" | "fail";
  agentResults: EvalResult[];
  summary: {
    totalAgents: number;
    passedAgents: number;
    failedAgents: number;
  };
}
