export type PipelineStage =
  | "ontology"
  | "process_graph"
  | "diagnostics"
  | "scenarios"
  | "recalculation"
  | "critic"
  | "synthesis";

export type JobStatus = "pending" | "running" | "completed" | "failed" | "escalated";

export interface ValidationFailure {
  field?: string;
  message: string;
  law4_violation: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationFailure[];
}
