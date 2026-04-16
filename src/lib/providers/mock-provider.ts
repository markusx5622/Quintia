import { LLMCompletionRequest, LLMCompletionResponse, LLMProvider } from "../types";

export class MockProvider implements LLMProvider {
  readonly providerId = "mock";

  async complete(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    // Simulate network latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    let content = "{}";

    // Fallback or explicit malformed test overrides
    if (request.userPrompt.includes("MALFORMED_LAW4") || request.systemPrompt.includes("MALFORMED_LAW4")) {
      content = JSON.stringify({
        scenario_candidates: [{
          id: "sc-mock-ERR", name: "Err", description: "Err", target_process_node_ids: ["pn-1"],
          improvement_type: "automation", assumptions: [], levers: [],
          roi: "50%", savings: "1M EUR" // This violates Law 4 schema explicitly
        }]
      });
    } else if (request.systemPrompt.includes("enterprise ontology architect")) {
      const isProcurement = request.userPrompt.toLowerCase().includes("procurement");
      content = JSON.stringify({
         entities: [
           { id: "e1", name: isProcurement ? "Procurement Officer" : "Client", type: "role", description: "Primary actor" },
           { id: "e2", name: isProcurement ? "Finance Manager" : "Manager", type: "role", description: "Approver" },
           { id: "e3", name: isProcurement ? "SAP ERP" : "System", type: "system", description: "Record system" },
           { id: "e4", name: isProcurement ? "Purchase Request" : "Order", type: "document", description: "Input doc" },
           { id: "e5", name: isProcurement ? "Email" : "Mail", type: "event", description: "Channel" }
         ],
         relationships: [],
         key_performace_indicators: ["Time to resolution"]
      });
    } else if (request.systemPrompt.includes("industrial process graph engineer")) {
      const isProcurement = request.userPrompt.toLowerCase().includes("procurement");
      content = JSON.stringify({
        raw_nodes: [
          { id: "pn-1", label: isProcurement ? "Review Request" : "Receive Order", action: "Review", role: "Procurement Officer" },
          { id: "pn-2", label: isProcurement ? "Manual Approval" : "Approve", action: "Approve", role: "Finance Manager" }
        ],
        raw_edges: [{ source: "pn-1", target: "pn-2" }]
      });
    } else if (request.systemPrompt.includes("operational process analyst")) {
      const isProcurement = request.userPrompt.toLowerCase().includes("procurement");
      content = JSON.stringify({
        issues: [
          { 
            id: "i-1", 
            nodeIds: ["pn-1"], 
            severity: isProcurement ? "high" : "medium", 
            category: isProcurement ? "bottleneck" : "manual_work", 
            description: isProcurement ? "Critical manual approval bottleneck with Finance Manager" : "Manual data entry", 
            evidence: "User text evidence" 
          }
        ],
        overall_health_score: isProcurement ? 45 : 85
      });
    } else if (request.systemPrompt.includes("operational cost assumption modeller")) {
      content = JSON.stringify({
        scenario_candidates: [
          {
            id: "sc-mock-1",
            name: "Mock Automation",
            description: "Automated test scenario",
            target_process_node_ids: ["pn-1"],
            improvement_type: "automation",
            assumptions: [
              { id: "a-1", description: "Cost", parameter_name: "current_annual_cost", parameter_value_estimate: 100000 },
              { id: "a-2", description: "Projected Cost", parameter_name: "projected_annual_cost", parameter_value_estimate: 50000 },
              { id: "a-3", description: "Implementation Cost", parameter_name: "implementation_cost", parameter_value_estimate: 10000 }
            ],
            levers: [{ id: "l-1", action_type: "automation", description: "RPA for entry" }]
          }
        ]
      });
    } else if (request.systemPrompt.includes("pipeline audit validator")) {
      content = JSON.stringify({
        score: 95,
        issues: [],
        validations: [{ rule: "Nodes explicitly modeled", passed: true }]
      });
    } else if (request.systemPrompt.includes("senior management report author")) {
      content = JSON.stringify({
        executive_summary: "The process is mostly manual but ripe for automation.",
        sections: [
          { title: "Current State", content: "Manual order entry takes 5 mins." },
          { title: "Recommendations", content: "Implement RPA immediately." },
          { title: "Roadmap", content: "Phase 1: Pilot. Phase 2: Scale." }
        ],
        recommendations: ["Implement RPA"],
        financial_references: []
      });
    }

    return {
      content,
      usage: {
        inputTokens: Math.round(request.userPrompt.length / 4),
        outputTokens: Math.round(content.length / 4),
      },
      providerId: this.providerId,
      modelId: "mock-model-v1",
      latencyMs: 50,
    };
  }
}
