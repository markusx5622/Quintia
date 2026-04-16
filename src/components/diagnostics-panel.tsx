"use client";

interface DiagnosticIssue {
  id: string;
  nodeIds: string[];
  severity: "low" | "medium" | "high" | "critical";
  category: string;
  description: string;
  evidence: string;
}

interface DiagnosticsPanelProps {
  diagnostics: { issues: DiagnosticIssue[]; overall_health_score: number } | null;
  onHoverIssue: (id: string | null) => void;
  selectedIssueId: string | null;
}

const SEVERITY_CONFIG = {
  critical: { bg: "bg-red-500/20", border: "border-red-500", badge: "bg-red-500 text-white", label: "Critical" },
  high:     { bg: "bg-orange-500/20", border: "border-orange-500", badge: "bg-orange-500 text-white", label: "High" },
  medium:   { bg: "bg-amber-500/20", border: "border-amber-500", badge: "bg-amber-400 text-amber-900", label: "Medium" },
  low:      { bg: "bg-gray-700/50", border: "border-gray-600", badge: "bg-gray-600 text-gray-200", label: "Low" },
};

function HealthRing({ score }: { score: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - score / 100);
  const color = score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative w-14 h-14 flex-shrink-0" aria-label={`Health score: ${score} out of 100`}>
      <svg viewBox="0 0 52 52" className="w-14 h-14 -rotate-90">
        <circle
          cx="26" cy="26" r={radius}
          strokeWidth="4"
          stroke="#1f2937"
          fill="none"
        />
        <circle
          cx="26" cy="26" r={radius}
          strokeWidth="4"
          stroke={color}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold tabular-nums" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

export function DiagnosticsPanel({ diagnostics, onHoverIssue, selectedIssueId }: DiagnosticsPanelProps) {
  if (!diagnostics?.issues) {
    return (
      <div className="quintia-card p-4 text-quintia-text-secondary text-sm">
        Diagnostics not available.
      </div>
    );
  }

  const sorted = [...diagnostics.issues].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="quintia-card flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-quintia-border flex items-center justify-between bg-quintia-surface/50">
        <div>
          <h3 className="font-semibold text-quintia-text text-sm">Process Diagnostics</h3>
          <p className="text-quintia-text-secondary text-xs mt-0.5">
            {sorted.length} issue{sorted.length !== 1 ? "s" : ""} identified
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <p className="quintia-section-label text-right">Health</p>
          </div>
          <HealthRing score={diagnostics.overall_health_score} />
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 p-3 space-y-2">
        {sorted.length === 0 && (
          <p className="text-quintia-text-secondary text-sm py-4 text-center">
            No significant issues detected.
          </p>
        )}
        {sorted.map((issue, idx) => {
          const config = SEVERITY_CONFIG[issue.severity] ?? SEVERITY_CONFIG.low;
          const isSelected = selectedIssueId === issue.id;

          return (
            <div
              key={issue.id}
              className={`
                animate-fade-in-up stagger-${Math.min(idx + 1, 5)}
                border rounded-lg p-3 cursor-pointer transition-all duration-200
                ${isSelected
                  ? `${config.bg} ${config.border} shadow-sm`
                  : `border-quintia-border bg-quintia-surface/40 hover:${config.bg} hover:${config.border}`
                }
              `}
              onMouseEnter={() => onHoverIssue(issue.id)}
              onMouseLeave={() => onHoverIssue(null)}
              role="button"
              aria-label={`${issue.category}: ${issue.description}`}
              tabIndex={0}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-quintia-text text-xs font-semibold capitalize leading-snug">
                  {issue.category.replace(/_/g, " ")}
                </span>
                <span className={`quintia-badge flex-shrink-0 ${config.badge}`}>
                  {config.label}
                </span>
              </div>
              <p className="text-quintia-text-secondary text-xs leading-relaxed">
                {issue.description}
              </p>
              {issue.nodeIds?.length > 0 && (
                <p className="text-quintia-text-secondary/60 text-[10px] mt-1.5 font-mono">
                  Nodes: {issue.nodeIds.join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
