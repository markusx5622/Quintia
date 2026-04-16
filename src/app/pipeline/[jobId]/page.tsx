"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { StageProgress } from "@/components/stage-progress";
import Link from "next/link";

export default function PipelineTrackerPage({ params }: { params: Promise<{ jobId: string }> }) {
  const [statusObj, setStatusObj] = useState<any>(null);
  const router = useRouter();
  const { jobId } = use(params);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const poll = async () => {
      try {
        const res = await fetch(`/api/pipeline/${jobId}/status`);
        const data = await res.json();
        setStatusObj(data);

        if (data.status === "completed") {
          router.push(`/results/${jobId}`);
        } else if (data.status === "escalated" || data.status === "failed") {
          clearInterval(interval);
        }
      } catch {
        // silent — will retry
      }
    };

    poll();
    interval = setInterval(poll, 2000);
    return () => clearInterval(interval);
  }, [jobId, router]);

  const isEscalated = statusObj?.status === "escalated" || statusObj?.status === "failed";
  const isRunning = statusObj && !isEscalated && statusObj.status !== "completed";

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6">
      <div className="w-full max-w-2xl space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="quintia-section-label">Pipeline Execution</p>
          <h1 className="text-2xl font-bold text-quintia-text">Processing Your Process</h1>
          <p className="text-quintia-text-secondary text-sm">
            The 7-stage AI pipeline is running. This page updates automatically.
          </p>
        </div>

        {/* Stage progress */}
        {statusObj && (
          <div className="quintia-card p-6">
            <StageProgress
              currentStage={statusObj.current_stage ?? "ontology"}
              jobStatus={statusObj.status ?? "running"}
            />
          </div>
        )}

        {/* Skeleton while loading */}
        {!statusObj && (
          <div className="quintia-card p-6 animate-pulse h-32 opacity-50" />
        )}

        {/* Status detail */}
        {statusObj && (
          <div className="quintia-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="quintia-section-label mb-1">Current Stage</p>
                <p className="text-quintia-text font-semibold capitalize">
                  {(statusObj.current_stage ?? "—").replace(/_/g, " ")}
                </p>
              </div>
              <div className="text-right">
                <p className="quintia-section-label mb-1">Status</p>
                <span
                  className={`quintia-badge ${
                    isEscalated
                      ? "bg-red-500/20 text-red-300 border border-red-500/40"
                      : isRunning
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                      : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  }`}
                >
                  {statusObj.status}
                </span>
              </div>
            </div>

            {/* Retry indicator */}
            {statusObj.retry_count > 0 && !isEscalated && (
              <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3">
                <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-amber-400 flex-shrink-0">
                  <path d="M14 6l-2-2-2 2M6 10H3l3-3M17 10h-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <circle cx="10" cy="13" r="4" stroke="currentColor" strokeWidth="1.5" />
                </svg>
                <p className="text-amber-300 text-sm">
                  Retry attempt {statusObj.retry_count} — recovering from transient error
                </p>
              </div>
            )}

            {/* Escalation */}
            {isEscalated && (
              <div
                className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 space-y-2"
                role="alert"
              >
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-red-400 flex-shrink-0">
                    <path d="M10 3L17 16H3L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M10 9v3M10 14h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                  <h3 className="font-semibold text-red-300 text-sm">Pipeline Halted — Escalation Required</h3>
                </div>
                {statusObj.error_message && (
                  <p className="font-mono text-xs text-red-400/80 bg-red-900/20 rounded p-2 break-all">
                    {statusObj.error_message}
                  </p>
                )}
                <Link href="/projects" className="quintia-btn-secondary text-sm inline-block mt-2">
                  ← Back to Projects
                </Link>
              </div>
            )}

            {/* Running spinner */}
            {isRunning && (
              <div className="flex items-center gap-3 text-quintia-text-secondary text-sm">
                <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 animate-spin text-quintia-primary">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                <span>Running... results will appear automatically</span>
              </div>
            )}
          </div>
        )}

        {/* Job ID trace */}
        <p className="text-center text-quintia-text-secondary/50 text-xs font-mono">
          Job ID: {jobId}
        </p>
      </div>
    </div>
  );
}
