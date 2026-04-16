"use client";

const STAGES = [
  { key: "ontology",     label: "Ontology",     short: "1" },
  { key: "process_graph",label: "Process Graph", short: "2" },
  { key: "diagnostics",  label: "Diagnostics",  short: "3" },
  { key: "scenarios",    label: "Scenarios",    short: "4" },
  { key: "recalculation",label: "Recalculate",  short: "5" },
  { key: "critic",       label: "Critic",       short: "6" },
  { key: "synthesis",    label: "Synthesis",    short: "7" },
] as const;

type StageStatus = "completed" | "active" | "pending" | "escalated";

function getStageStatus(
  stageKey: string,
  currentStage: string,
  jobStatus: string
): StageStatus {
  const stageIndex = STAGES.findIndex((s) => s.key === stageKey);
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  if (jobStatus === "escalated" || jobStatus === "failed") {
    if (stageKey === currentStage) return "escalated";
    if (stageIndex < currentIndex) return "completed";
    return "pending";
  }
  if (stageIndex < currentIndex) return "completed";
  if (stageKey === currentStage) return "active";
  return "pending";
}

interface StageProgressProps {
  currentStage: string;
  jobStatus: string;
}

export function StageProgress({ currentStage, jobStatus }: StageProgressProps) {
  return (
    <div className="w-full" role="progressbar" aria-label="Pipeline progress">
      <div className="flex items-center justify-between">
        {STAGES.map((stage, idx) => {
          const status = getStageStatus(stage.key, currentStage, jobStatus);
          const isLast = idx === STAGES.length - 1;

          return (
            <div key={stage.key} className="flex items-center flex-1 min-w-0">
              {/* Step node */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div
                  className={`
                    w-9 h-9 rounded-full flex items-center justify-center
                    font-bold text-sm border-2 transition-all duration-300
                    ${status === "completed"
                      ? "bg-quintia-success border-quintia-success text-quintia-bg"
                      : status === "active"
                      ? "bg-quintia-primary border-quintia-primary text-white animate-pulse-ring"
                      : status === "escalated"
                      ? "bg-quintia-error border-quintia-error text-white"
                      : "bg-quintia-surface border-quintia-border text-quintia-text-secondary"
                    }
                  `}
                  aria-label={`${stage.label}: ${status}`}
                >
                  {status === "completed" ? (
                    <svg viewBox="0 0 14 14" fill="none" className="w-4 h-4" aria-hidden="true">
                      <path d="M2 7l3.5 3.5L12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : status === "escalated" ? (
                    <svg viewBox="0 0 14 14" fill="none" className="w-4 h-4" aria-hidden="true">
                      <path d="M7 3v4M7 10h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    stage.short
                  )}
                </div>
                <span
                  className={`mt-1.5 text-xs text-center leading-tight max-w-[64px] truncate
                    ${status === "active" ? "text-quintia-primary font-semibold"
                      : status === "completed" ? "text-quintia-success"
                      : status === "escalated" ? "text-quintia-error font-semibold"
                      : "text-quintia-text-secondary"
                    }
                  `}
                >
                  {stage.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 mx-1 relative h-0.5 mt-[-1rem]">
                  <div className="absolute inset-0 bg-quintia-border rounded" />
                  {(status === "completed") && (
                    <div className="absolute inset-0 bg-quintia-success rounded transition-all duration-500" />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
