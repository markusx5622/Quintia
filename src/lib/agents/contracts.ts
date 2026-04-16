import { z } from "zod";

// --- Agent 1: Ontology Extractor --- //
export const ontologyOutputSchema = z.object({
  entities: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["role", "resource", "system", "document", "kpi", "event", "other"]),
    description: z.string(),
  })),
  relationships: z.array(z.object({
    sourceId: z.string(),
    targetId: z.string(),
    type: z.string(),
    description: z.string().optional(),
  })),
  key_performace_indicators: z.array(z.string()),
});

// --- Agent 2: Process Architect --- //
export const processGraphOutputSchema = z.object({
  raw_nodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    action: z.string(),
    role: z.string(),
    system: z.string().optional(),
  })),
  raw_edges: z.array(z.object({
    source: z.string(),
    target: z.string(),
    condition: z.string().optional(),
  })),
});

// --- Agent 3: Industrial Diagnostician --- //
export const diagnosticsOutputSchema = z.object({
  issues: z.array(z.object({
    id: z.string(),
    nodeIds: z.array(z.string()),
    severity: z.enum(["low", "medium", "high", "critical"]),
    category: z.enum(["bottleneck", "redundancy", "compliance", "data_silo", "manual_work"]),
    description: z.string(),
    evidence: z.string(),
  })),
  overall_health_score: z.number().min(0).max(100),
});

// --- Agent 4: Financial Simulator --- //
export const scenariosOutputSchema = z.object({
  scenario_candidates: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    target_process_node_ids: z.array(z.string()),
    improvement_type: z.enum(["automation", "elimination", "parallelization", "outsourcing", "optimization"]),
    assumptions: z.array(z.object({
      id: z.string(),
      description: z.string(),
      parameter_name: z.string(),
      parameter_value_estimate: z.union([z.string(), z.number()]),
    })),
    levers: z.array(z.object({
      id: z.string(),
      action_type: z.enum(["automation", "elimination", "parallelization", "outsourcing", "optimization"]),
      description: z.string(),
    })),
  })).nonempty()
  // STRICT: Zod implicitly ignores unknown keys unless .strict() is used.
  // We use .strict() on ScenarioCandidate so that if an LLM sneaks in an "roi" field, parsing fails!
}).strict(); // Schema-level Law 4 Enforcement!

// Actually, let's make sure the inner objects are also strict.
const strictScenarioCandidateSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  target_process_node_ids: z.array(z.string()),
  improvement_type: z.enum(["automation", "elimination", "parallelization", "outsourcing", "optimization"]),
  assumptions: z.array(z.object({
    id: z.string(),
    description: z.string(),
    parameter_name: z.string(),
    parameter_value_estimate: z.union([z.string(), z.number()]),
  }).strict()),
  levers: z.array(z.object({
    id: z.string(),
    action_type: z.enum(["automation", "elimination", "parallelization", "outsourcing", "optimization"]),
    description: z.string(),
  }).strict()),
}).strict();

export const scenariosOutputSchemaStrict = z.object({
  scenario_candidates: z.array(strictScenarioCandidateSchema).nonempty()
}).strict();


// --- Agent 5: Consistency Critic --- //
export const criticOutputSchema = z.object({
  score: z.number().min(0).max(100),
  issues: z.array(z.string()),
  validations: z.array(z.object({
    rule: z.string(),
    passed: z.boolean(),
    details: z.string().optional(),
  })),
});

// --- Agent 6: Executive Synthesizer --- //
export const synthesisOutputSchema = z.object({
  executive_summary: z.string(),
  sections: z.array(z.object({
    title: z.string(),
    content: z.string(),
  })),
  recommendations: z.array(z.string()),
  financial_references: z.array(z.object({
    scenario_id: z.string(),
    financial_result_id: z.string(),
    reference_context: z.string(),
  })),
}).strict(); // Strict to prevent injection of direct financial numbers
