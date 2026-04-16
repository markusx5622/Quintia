"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { ProcessGraphViewer } from "@/components/process-graph-viewer";
import { DiagnosticsPanel } from "@/components/diagnostics-panel";
import { FinancialCard } from "@/components/financial-card";

interface FinancialResult {
  id: string;
  scenario_id: string;
  annual_savings: number;
  roi_percentage: number;
  payback_months: number;
  formula_version: number;
  status: string;
}

export default function ResultsPage({ params }: { params: Promise<{ jobId: string }> }) {
  const [financials, setFinancials] = useState<FinancialResult[]>([]);
  const [report, setReport] = useState<any>(null);
  const [graph, setGraph] = useState<any>(null);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { jobId } = use(params);

  useEffect(() => {
    Promise.all([
      fetch(`/api/pipeline/${jobId}/financials`).then((r) => r.json()),
      fetch(`/api/pipeline/${jobId}/report`).then((r) => r.json()),
      fetch(`/api/pipeline/${jobId}/graph`).then((r) => r.json()),
      fetch(`/api/pipeline/${jobId}/diagnostics`).then((r) => r.json()),
    ]).then(([finData, repData, graphData, diagData]) => {
      setFinancials(Array.isArray(finData) ? finData : []);
      if (repData?.data) setReport(JSON.parse(repData.data));
      if (graphData) setGraph(graphData);
      if (diagData) setDiagnostics(diagData);
      setLoading(false);
    });
  }, [jobId]);

  if (loading) {
    return (
      <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-4 animate-pulse">
        <div className="h-10 bg-quintia-surface rounded-xl w-64 opacity-60" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-40 bg-quintia-surface rounded-xl opacity-40" />)}
        </div>
        <div className="h-[500px] bg-quintia-surface rounded-xl opacity-40" />
      </div>
    );
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-6 py-8 space-y-8 animate-fade-in-up">
      {/* ── Page Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="quintia-section-label mb-1">Pipeline Output</p>
          <h1 className="text-3xl font-bold text-quintia-text">Executive Dashboard</h1>
        </div>
        <Link href="/projects" className="quintia-btn-secondary text-sm">
          ← Projects
        </Link>
      </div>

      {/* ── FINANCIAL IMPACT — HIGHEST PRIORITY ─────────── */}
      <section aria-label="Deterministic Financial Results">
        <div className="flex items-center gap-3 mb-4">
          {/* Shield icon */}
          <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-quintia-success flex-shrink-0" aria-hidden="true">
            <path d="M10 2L3 5v5c0 4.418 3.022 8.558 7 9.5 3.978-.942 7-5.082 7-9.5V5l-7-3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <h2 className="text-lg font-bold text-quintia-text">Financial Impact</h2>
          <span className="quintia-badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
            Deterministic · Read-only
          </span>
        </div>

        {financials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {financials.map((f) => (
              <FinancialCard
                key={f.id}
                scenarioId={f.scenario_id}
                annualSavings={f.annual_savings}
                roiPercentage={f.roi_percentage}
                paybackMonths={f.payback_months}
                formulaVersion={f.formula_version}
              />
            ))}
          </div>
        ) : (
          <div className="quintia-card p-6 text-quintia-text-secondary text-sm">
            No deterministic financial results computed for this job.
          </div>
        )}
      </section>

      {/* ── MAIN WORKSPACE — 2 column executive layout ──── */}
      <section aria-label="Process Workspace" className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-6">

        {/* LEFT: Graph + Diagnostics */}
        <div className="flex flex-col gap-6 min-h-0">
          {/* Graph */}
          <div>
            <h2 className="text-sm font-semibold text-quintia-text mb-3 flex items-center gap-2">
              <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-quintia-primary" aria-hidden="true">
                <circle cx="5" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="15" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="15" cy="15" r="2.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7.5 10H12.5M7.5 9L12.5 5.5M7.5 11L12.5 14.5" stroke="currentColor" strokeWidth="1.2" />
              </svg>
              Process Graph
              {diagnostics?.issues?.some((i: any) => i.severity === "high" || i.severity === "critical") && (
                <span className="quintia-badge bg-red-500/20 text-red-300 border border-red-500/40 text-[10px]">
                  ⚠ Issues Detected
                </span>
              )}
            </h2>
            <div className="h-[420px]">
              <ProcessGraphViewer
                graph={graph}
                diagnostics={diagnostics}
                selectedIssueId={selectedIssueId}
              />
            </div>
          </div>

          {/* Diagnostics */}
          <div>
            <h2 className="text-sm font-semibold text-quintia-text mb-3 flex items-center gap-2">
              <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-quintia-warning" aria-hidden="true">
                <path d="M10 3L17 16H3L10 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M10 9v3M10 14h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Diagnostics
            </h2>
            <div className="max-h-72 overflow-y-auto">
              <DiagnosticsPanel
                diagnostics={diagnostics}
                onHoverIssue={setSelectedIssueId}
                selectedIssueId={selectedIssueId}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Executive Synthesis — secondary, clearly labeled */}
        <div className="self-start sticky top-20">
          <div className="flex items-center gap-2 mb-3">
            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-quintia-primary" aria-hidden="true">
              <path d="M4 4h12v2H4zM4 8h8v2H4zM4 12h10v2H4zM4 16h6v2H4z" fill="currentColor" fillOpacity=".8" />
            </svg>
            <h2 className="text-sm font-semibold text-quintia-text">Executive Synthesis</h2>
            <span className="quintia-badge bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px]">
              AI-Generated Narrative
            </span>
          </div>

          <div className="quintia-card overflow-hidden">
            {/* Narrative "secondary" watermark band */}
            <div className="bg-blue-500/5 border-b border-blue-500/20 px-5 py-2.5 flex items-center gap-2">
              <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 5v3M8 10h.01" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <p className="text-blue-400 text-xs">
                This section is AI-generated narrative. Financial figures above are deterministic and authoritative.
              </p>
            </div>

            <div className="p-5 overflow-y-auto max-h-[560px] space-y-6">
              {report ? (
                <>
                  {/* Executive Summary */}
                  <div>
                    <p className="quintia-section-label mb-2">Executive Summary</p>
                    <p className="text-quintia-text-secondary text-sm leading-relaxed whitespace-pre-line">
                      {report.executive_summary}
                    </p>
                  </div>

                  {/* Sections */}
                  {report.sections?.map((sec: any, i: number) => (
                    <div key={i} className="border-t border-quintia-border pt-4">
                      <p className="quintia-section-label mb-2">{sec.title}</p>
                      <p className="text-quintia-text-secondary text-sm leading-relaxed whitespace-pre-line">
                        {sec.content}
                      </p>
                    </div>
                  ))}

                  {/* Recommendations */}
                  {report.recommendations?.length > 0 && (
                    <div className="border-t border-quintia-border pt-4">
                      <p className="quintia-section-label mb-3">Recommendations</p>
                      <ul className="space-y-2">
                        {report.recommendations.map((rec: string, i: number) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm text-quintia-text-secondary">
                            <span className="mt-1 w-1.5 h-1.5 rounded-full bg-quintia-primary flex-shrink-0" aria-hidden="true" />
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Financial references (IDs only — Law 4 compliant) */}
                  {report.financial_references?.length > 0 && (
                    <div className="border-t border-quintia-border pt-4">
                      <p className="quintia-section-label mb-2">Financial References</p>
                      <ul className="space-y-1.5">
                        {report.financial_references.map((ref: any, i: number) => (
                          <li key={i} className="text-xs text-quintia-text-secondary/70 font-mono">
                            {ref.reference_context}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-quintia-text-secondary text-sm">
                  No executive report generated for this pipeline run.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer trace ────────────────────────────────── */}
      <footer className="border-t border-quintia-border pt-4 flex items-center justify-between text-xs text-quintia-text-secondary/50 font-mono">
        <span>Job: {jobId}</span>
        <span>QUINTIA Process Intelligence Platform</span>
      </footer>
    </div>
  );
}
