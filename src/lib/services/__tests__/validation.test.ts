import { describe, it, expect } from "vitest";
import { ValidationService } from "../validation";
import { scenariosOutputSchemaStrict } from "../../agents/contracts";

describe("ValidationService - Law 4 Strict Enforcement", () => {
  it("rejects scenarios containing extraneous financial fields", () => {
    // This candidate mimics an LLM trying to slip in 'roi' and 'savings'
    const malformedData = {
      scenario_candidates: [
        {
          id: "sc-test",
          name: "Test",
          description: "Test description",
          target_process_node_ids: ["n1"],
          improvement_type: "automation",
          assumptions: [],
          levers: [],
          // --- FORBIDDEN LAW 4 INJECTION ---
          roi: 150,
          savings: "50000 EUR",
          payback_months: 6
        }
      ]
    };

    const result = ValidationService.validateSchema(scenariosOutputSchemaStrict, malformedData);

    expect(result.valid).toBe(false);
    expect(result.result.errors.length).toBeGreaterThan(0);
    
    // Ensure we correctly flag this as a Law 4 violation based on keys
    const law4Error = result.result.errors.find((e: { law4_violation?: boolean }) => e.law4_violation === true);
    expect(law4Error).toBeDefined();
  });

  it("accepts valid, clean scenario candidates", () => {
    const validData = {
      scenario_candidates: [
        {
          id: "sc-test",
          name: "Test",
          description: "Test description",
          target_process_node_ids: ["n1"],
          improvement_type: "automation",
          assumptions: [
            {
              id: "a1",
              description: "Dev time saved",
              parameter_name: "hours_saved_per_week",
              parameter_value_estimate: 20
            }
          ],
          levers: [
            {
              id: "l1",
              action_type: "automation",
              description: "Automate report generation"
            }
          ]
        }
      ]
    };

    const result = ValidationService.validateSchema(scenariosOutputSchemaStrict, validData);

    expect(result.valid).toBe(true);
    expect(result.data).toBeDefined();
  });
});
