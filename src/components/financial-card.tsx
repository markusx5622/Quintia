"use client";

interface FinancialCardProps {
  scenarioId: string;
  annualSavings: number;
  roiPercentage: number;
  paybackMonths: number;
  formulaVersion: number;
}

export function FinancialCard({
  scenarioId,
  annualSavings,
  roiPercentage,
  paybackMonths,
  formulaVersion,
}: FinancialCardProps) {
  const shortId = scenarioId.slice(-8).toUpperCase();

  return (
    <div className="quintia-card border-l-4 border-l-quintia-success animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-quintia-border">
        <div className="flex items-center gap-2">
          {/* Shield lock icon */}
          <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 flex-shrink-0 text-quintia-success" aria-hidden="true">
            <path
              d="M10 2L3 5v5c0 4.418 3.022 8.558 7 9.5 3.978-.942 7-5.082 7-9.5V5l-7-3z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <rect x="7.5" y="9" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.2" />
            <line x1="10" y1="7.5" x2="10" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <span className="quintia-section-label">Deterministic Engine Output</span>
        </div>
        <span className="text-quintia-text-secondary text-xs font-mono">
          SCN-{shortId}
        </span>
      </div>

      {/* Metrics grid */}
      <div className="px-5 py-4 grid grid-cols-3 gap-4">
        {/* Annual Savings */}
        <div className="col-span-3 sm:col-span-1">
          <p className="quintia-section-label mb-1">Annual Savings</p>
          <p className="text-2xl font-bold text-quintia-success tabular-nums">
            ${annualSavings.toLocaleString()}
          </p>
        </div>

        {/* ROI */}
        <div>
          <p className="quintia-section-label mb-1">ROI</p>
          <p className="text-xl font-semibold text-quintia-text tabular-nums">
            {roiPercentage.toFixed(1)}%
          </p>
        </div>

        {/* Payback */}
        <div>
          <p className="quintia-section-label mb-1">Payback</p>
          <p className="text-xl font-semibold text-quintia-text tabular-nums">
            {paybackMonths.toFixed(1)} <span className="text-sm font-normal text-quintia-text-secondary">mos</span>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 pb-3 flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-quintia-success flex-shrink-0" aria-hidden="true" />
        <p className="text-xs text-quintia-text-secondary font-mono">
          Formula v{formulaVersion} · Read-only · Deterministic recalculation applied
        </p>
      </div>
    </div>
  );
}
