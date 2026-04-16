export interface FinancialInput {
  scenario_id: string;
  current_annual_cost: number; // EUR, must be >= 0
  projected_annual_cost: number; // EUR, must be >= 0
  implementation_cost: number; // EUR, must be >= 0
  additional_annual_benefits: number; // EUR, must be >= 0
}

export type FinancialStatus = "viable" | "non_viable" | "not_applicable";

export interface FinancialCalcResult {
  status: FinancialStatus;
  annual_savings: number; // EUR, 2 decimal
  roi_percentage: number | null; // %, 2 decimal
  payback_months: number | null; // months, 1 decimal
  formula_version: string; // "1.0.0"
  input_basis: FinancialInput;
  status_reason: string | null;
  calculated_at: string; // ISO timestamp
}
