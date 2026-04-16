import { GoldenCase, QualityMetric, FailureCategory } from "./types";
import { Law4Scanner } from "./law4-regression";

export class ScoringModel {
  /**
   * Agent 1: Ontology Extraction Scoring
   */
  static scoreAgent1(output: any, golden: GoldenCase): QualityMetric[] {
    const metrics: QualityMetric[] = [];
    
    // 1. Entity Coverage
    const foundEntities = (output.entities || []).map((e: any) => e.name.toLowerCase());
    const expected = golden.expected_entities.map(e => e.toLowerCase());
    const matched = expected.filter(e => foundEntities.some((fe: string) => fe.includes(e)));
    const coverage = expected.length > 0 ? (matched.length / expected.length) * 100 : 100;

    metrics.push({
      name: "Entity Coverage",
      score: Math.round(coverage),
      passed: coverage >= 80,
      details: `Matched ${matched.length}/${expected.length} core entities.`
    });

    return metrics;
  }

  /**
   * Agent 2: Process Graph Scoring
   */
  static scoreAgent2(output: any, ontology: any): QualityMetric[] {
    const metrics: QualityMetric[] = [];
    
    // 1. Node Anchoring (Logic)
    const ontologyRoles = (ontology.entities || []).map((e: any) => e.name.toLowerCase());
    const nodes = (output.raw_nodes || []);
    const unanchored = nodes.filter((n: any) => !ontologyRoles.some((r: string) => n.role.toLowerCase().includes(r)));
    const anchoringScore = nodes.length > 0 ? ((nodes.length - unanchored.length) / nodes.length) * 100 : 100;

    metrics.push({
      name: "Ontology Anchoring",
      score: Math.round(anchoringScore),
      passed: anchoringScore === 100,
      details: unanchored.length > 0 ? `Unanchored roles: ${unanchored.map((u: any) => u.role).join(", ")}` : "All nodes anchored."
    });

    return metrics;
  }

  /**
   * Agent 3: Industrial Diagnostician Scoring
   */
  static scoreAgent3(output: any, graph: any, golden: GoldenCase): QualityMetric[] {
    const metrics: QualityMetric[] = [];
    
    // 1. Bottleneck Alignment
    const issues = (output.issues || []);
    const bottleneckFound = issues.some((i: any) => 
      i.category === "bottleneck" && 
      (i.severity === "high" || i.severity === "critical") &&
      golden.expected_bottleneck_keywords.some(kw => i.description.toLowerCase().includes(kw.toLowerCase()))
    );

    metrics.push({
      name: "Bottleneck Alignment",
      score: bottleneckFound ? 100 : 0,
      passed: bottleneckFound,
      details: bottleneckFound ? "Critical bottleneck identified correctly." : "Failed to identify critical bottleneck."
    });

    // 2. Referential Integrity
    const nodeIds = (graph.raw_nodes || []).map((n: any) => n.id);
    const invalidRefs = issues.filter((i: any) => i.nodeIds.some((nid: string) => !nodeIds.includes(nid)));
    const integrityScore = issues.length > 0 ? ((issues.length - invalidRefs.length) / issues.length) * 100 : 100;

    metrics.push({
      name: "Referential Integrity",
      score: Math.round(integrityScore),
      passed: integrityScore === 100,
      details: invalidRefs.length > 0 ? "Diagnostic references non-existent nodes." : "All references valid."
    });

    return metrics;
  }

  /**
   * Agent 4: Financial Simulator Scoring
   */
  static scoreAgent4(output: any, graph: any): QualityMetric[] {
    const metrics: QualityMetric[] = [];
    const candidates = output.scenario_candidates || [];

    // 1. Traceability
    const nodeIds = (graph.raw_nodes || []).map((n: any) => n.id);
    const brokenScenarios = candidates.filter((c: any) => 
      c.target_process_node_ids.some((nid: string) => !nodeIds.includes(nid))
    );
    const traceabilityScore = candidates.length > 0 ? ((candidates.length - brokenScenarios.length) / candidates.length) * 100 : 100;

    metrics.push({
      name: "Traceability",
      score: Math.round(traceabilityScore),
      passed: traceabilityScore === 100,
      details: brokenScenarios.length > 0 ? "Scenarios reference non-existent node IDs." : "100% node traceability."
    });

    return metrics;
  }

  /**
   * Agent 6: Executive Synthesizer Scoring
   */
  static scoreAgent6(output: any): QualityMetric[] {
    const metrics: QualityMetric[] = [];
    const sections = (output.sections || []).map((s: any) => s.title.toLowerCase());
    
    // 1. Structural Integrity
    const required = ["current state", "recommendations"];
    const missing = required.filter(r => !sections.some((s: string) => s.includes(r)));
    const structScore = missing.length === 0 ? 100 : 0;

    metrics.push({
      name: "Structural Integrity",
      score: structScore,
      passed: structScore === 100,
      details: missing.length > 0 ? `Missing required sections: ${missing.join(", ")}` : "All required sections present."
    });

    return metrics;
  }
}
