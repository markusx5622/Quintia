import { ZodError, ZodType, ZodIssue } from "zod";
import { ValidationResult } from "../types";

export class ValidationService {
  /**
   * Validates an object strictly against a Zod schema.
   * This is the PRIMARY control for Law 4 (schema-level exclusion).
   * Because contracts.ts uses .strict(), any injected 'roi' or 'savings' field will fail parsing.
   */
  static validateSchema<T>(schema: ZodType<T>, data: unknown): { valid: boolean; data?: T; result: ValidationResult } {
    try {
      const parsed = schema.parse(data);
      return {
        valid: true,
        data: parsed,
        result: { valid: true, errors: [] },
      };
    } catch (e) {
      if (e instanceof ZodError) {
        // The `e.issues` is correctly typed in Zod
        const errors = e.issues.map((err: ZodIssue) => {
          // Identify if the error is due to a Law 4 unpermitted field injection
          const law4Violations = ["roi", "savings", "payback", "net_benefit", "total_cost_saved"];
          const fieldPath = err.path.join(".");
          // Zod 'unrecognized_keys' error contains the keys in 'keys' property
          const isLaw4 = err.code === "unrecognized_keys" && 
            err.keys.some((k: string) => law4Violations.some(v => k.toLowerCase().includes(v)));

          return {
            field: fieldPath,
            message: err.message,
            law4_violation: isLaw4,
          };
        });

        return {
          valid: false,
          result: {
            valid: false,
            errors,
          },
        };
      }
      
      return {
        valid: false,
        result: {
          valid: false,
          errors: [{ message: "Unknown validation error", law4_violation: false }],
        },
      };
    }
  }

  /**
   * SECONDARY control for Law 4. 
   * Scans raw text for numeric assertions next to financial keywords.
   */
  static scanForLaw4Violations(text: string): boolean {
    const suspiciousPatterns = [
      /roi\s*(?:of|is|:|=|>|estimated at)?\s*[$€]?\s*\d+/i,
      /ahorro\s*(?:anual|estimado|de)?\s*(?:es|:|=|>)?\s*[$€]?\s*\d+/i,
      /payback\s*(?:period|in|is|:|=|>)?\s*\d+/i,
      /return on investment\s*(?:of|is|:|=|>)?\s*[$€]?\s*\d+/i
    ];
    
    return suspiciousPatterns.some(pattern => pattern.test(text));
  }
}
