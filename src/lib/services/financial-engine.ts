import { FinancialInput, FinancialCalcResult, FinancialStatus } from "../types";

export class FinancialValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FinancialValidationError";
  }
}

export class FinancialEngine {
  private static readonly FORMULA_VERSION = "1.0.0";

  /**
   * Calculates financial metrics based deterministically on inputs.
   */
  static calculateFinancials(input: FinancialInput): FinancialCalcResult {
    this.validateFinancialInput(input);

    const annual_savings = this.roundCurrency(
      input.current_annual_cost - input.projected_annual_cost + input.additional_annual_benefits
    );

    let status: FinancialStatus;
    let roi_percentage: number | null = null;
    let payback_months: number | null = null;
    let status_reason: string | null = null;

    if (annual_savings <= 0) {
      status = "non_viable";
      status_reason = "Ahorro anual nulo o negativo: inversión no recuperable";
      
      // Calculate ROI but payback is null because it will never happen
      if (input.implementation_cost > 0) {
        roi_percentage = this.roundPercentage((annual_savings / input.implementation_cost) * 100);
      }
    } else if (input.implementation_cost === 0) {
      status = "not_applicable";
      status_reason = "Sin coste de implementación: no aplica ROI ni payback";
      // roi and payback remain null
    } else {
      status = "viable";
      roi_percentage = this.roundPercentage((annual_savings / input.implementation_cost) * 100);
      payback_months = this.roundMonths((input.implementation_cost / annual_savings) * 12);
    }

    return {
      status,
      annual_savings,
      roi_percentage,
      payback_months,
      formula_version: this.FORMULA_VERSION,
      input_basis: { ...input },
      status_reason,
      calculated_at: new Date().toISOString(),
    };
  }

  static validateFinancialInput(input: FinancialInput): void {
    const fields = [
      { name: "current_annual_cost", value: input.current_annual_cost },
      { name: "projected_annual_cost", value: input.projected_annual_cost },
      { name: "implementation_cost", value: input.implementation_cost },
      { name: "additional_annual_benefits", value: input.additional_annual_benefits },
    ];

    for (const field of fields) {
      if (typeof field.value !== "number") {
        throw new FinancialValidationError(`Field ${field.name} must be a number.`);
      }
      if (!Number.isFinite(field.value)) {
        throw new FinancialValidationError(`Field ${field.name} must be a finite number.`);
      }
      if (field.value < 0) {
        throw new FinancialValidationError(`Field ${field.name} cannot be negative.`);
      }
    }
  }

  static roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
  }

  static roundPercentage(value: number): number {
    return Math.round(value * 100) / 100;
  }

  static roundMonths(value: number): number {
    return Math.round(value * 10) / 10;
  }
}
