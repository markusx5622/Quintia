/**
 * Slice 8 — Law 4 Regression Scanner
 * 
 * Deterministically checks for forbidden financial terms and numeric leakage 
 * in AI-generated outputs where they are strictly prohibited.
 */

const FORBIDDEN_KEYWORDS = [
  "roi",
  "return_on_investment",
  "net_savings",
  "annual_savings",
  "npv",
  "irr",
  "payback",
  "payback_period",
  "payback_months",
  "savings",
  "profit",
  "margin"
];

// Regex to find potential financial figures like $1,000, 50,000 EUR, or percentages in context of savings
const CURRENCY_PATTERN = /(\$|[\d,.]+)\s*(USD|EUR|GBP|€|savings|ROI|percent|%)/gi;

export class Law4Scanner {
  /**
   * Scans a string or object for Law 4 violations.
   * Returns true if leakage is found.
   */
  static scan(input: any): { leakageFound: boolean; evidence: string[] } {
    const text = typeof input === "string" ? input : JSON.stringify(input);
    const lowerText = text.toLowerCase();
    const evidence: string[] = [];

    // 1. Keyword Check
    for (const kw of FORBIDDEN_KEYWORDS) {
      if (lowerText.includes(kw)) {
        evidence.push(`Forbidden keyword found: "${kw}"`);
      }
    }

    // 2. Pattern Check (potential phantom figures)
    const matches = text.match(CURRENCY_PATTERN);
    if (matches) {
      for (const m of matches) {
        // Simple heuristic: if it looks like a financial statement
        evidence.push(`Potential financial leakage pattern found: "${m}"`);
      }
    }

    return {
      leakageFound: evidence.length > 0,
      evidence
    };
  }
}
