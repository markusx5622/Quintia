import { describe, it, expect } from "vitest";
import { FinancialEngine, FinancialValidationError } from "../financial-engine";

describe("FinancialEngine", () => {
  it("computes viable scenario correctly", () => {
    const input = {
      scenario_id: "sc-1",
      current_annual_cost: 100000,
      projected_annual_cost: 60000,
      implementation_cost: 50000,
      additional_annual_benefits: 10000,
    };
    // Savings = 100,000 - 60,000 + 10,000 = 50,000
    // ROI = (50,000 / 50,000) * 100 = 100%
    // Payback = (50,000 / 50,000) * 12 = 12 months

    const result = FinancialEngine.calculateFinancials(input);

    expect(result.status).toBe("viable");
    expect(result.annual_savings).toBe(50000);
    expect(result.roi_percentage).toBe(100);
    expect(result.payback_months).toBe(12);
  });

  it("handles not_applicable when implementation_cost is 0", () => {
    const input = {
      scenario_id: "sc-2",
      current_annual_cost: 100000,
      projected_annual_cost: 80000,
      implementation_cost: 0,
      additional_annual_benefits: 0,
    };
    // Savings = 20,000
    // ROI = N/A
    // Payback = N/A

    const result = FinancialEngine.calculateFinancials(input);

    expect(result.status).toBe("not_applicable");
    expect(result.annual_savings).toBe(20000);
    expect(result.roi_percentage).toBeNull();
    expect(result.payback_months).toBeNull();
    expect(result.status_reason).toContain("no aplica");
  });

  it("handles non_viable when savings are negative", () => {
    const input = {
      scenario_id: "sc-3",
      current_annual_cost: 100000,
      projected_annual_cost: 120000,
      implementation_cost: 10000,
      additional_annual_benefits: 0,
    };
    // Savings = -20000
    // ROI = (-20000 / 10000) * 100 = -200%
    // Payback = N/A

    const result = FinancialEngine.calculateFinancials(input);

    expect(result.status).toBe("non_viable");
    expect(result.annual_savings).toBe(-20000);
    expect(result.roi_percentage).toBe(-200);
    expect(result.payback_months).toBeNull();
  });

  it("rejects negative inputs", () => {
    const input = {
      scenario_id: "sc-4",
      current_annual_cost: -100,
      projected_annual_cost: 100,
      implementation_cost: 100,
      additional_annual_benefits: 0,
    };

    expect(() => FinancialEngine.calculateFinancials(input)).toThrow(FinancialValidationError);
  });

  it("rejects invalid numbers like Infinity", () => {
    const input = {
      scenario_id: "sc-5",
      current_annual_cost: 100,
      projected_annual_cost: 100,
      implementation_cost: Infinity,
      additional_annual_benefits: 0,
    };

    expect(() => FinancialEngine.calculateFinancials(input)).toThrow(FinancialValidationError);
  });
});
