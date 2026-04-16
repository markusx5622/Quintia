"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const MAX_CHARS = 20000;
const MIN_CHARS = 100;

export default function NewProjectPage() {
  const [name, setName] = useState("");
  const [narrativeText, setNarrativeText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const charCount = narrativeText.length;
  const isOverLimit = charCount > MAX_CHARS;
  const isTooShort = charCount < MIN_CHARS;
  const canSubmit = name.trim().length > 0 && !isTooShort && !isOverLimit && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), narrativeText }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to create project");

      const startRes = await fetch(`/api/pipeline/${data.job.id}/start`, { method: "POST" });
      if (!startRes.ok) throw new Error("Pipeline trigger failed");

      router.push(`/pipeline/${data.job.id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl animate-fade-in-up">
        {/* Back link */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-quintia-text-secondary hover:text-quintia-text text-sm mb-6 transition-colors focus:outline-none focus:ring-2 focus:ring-quintia-primary rounded"
        >
          <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4" aria-hidden="true">
            <path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Projects
        </Link>

        {/* Card */}
        <div className="quintia-card p-8">
          {/* Header */}
          <div className="mb-8">
            <p className="quintia-section-label mb-1">Intelligence Pipeline</p>
            <h1 className="text-2xl font-bold text-quintia-text">New Project</h1>
            <p className="text-quintia-text-secondary text-sm mt-1.5">
              Describe your business process. The AI pipeline will extract structure, detect bottlenecks, and compute financial impact.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" noValidate>
            {/* Project Name */}
            <div>
              <label htmlFor="project-name" className="block text-sm font-medium text-quintia-text mb-2">
                Project Name
              </label>
              <input
                id="project-name"
                type="text"
                className="quintia-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Procurement Approval Process"
                required
                maxLength={120}
                autoFocus
              />
            </div>

            {/* Process Narrative */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="narrative" className="text-sm font-medium text-quintia-text">
                  Process Narrative
                </label>
                <span
                  className={`text-xs tabular-nums font-mono ${
                    isOverLimit
                      ? "text-quintia-error"
                      : isTooShort && charCount > 0
                      ? "text-quintia-warning"
                      : "text-quintia-text-secondary"
                  }`}
                >
                  {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>
              <textarea
                id="narrative"
                className={`quintia-input h-64 resize-none leading-relaxed ${
                  isOverLimit ? "border-quintia-error focus:ring-quintia-error focus:border-quintia-error" : ""
                }`}
                value={narrativeText}
                onChange={(e) => setNarrativeText(e.target.value)}
                placeholder={`Describe the process in plain language. Include:\n• Who performs each step (roles)\n• What systems or tools are involved\n• Where delays or handoffs occur\n• Any KPIs or known pain points`}
                required
              />
              {isTooShort && charCount > 0 && (
                <p className="text-quintia-warning text-xs mt-1.5">
                  Minimum {MIN_CHARS} characters required for meaningful analysis ({MIN_CHARS - charCount} more needed).
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div
                className="flex items-start gap-3 bg-red-500/10 border border-red-500/30 text-red-300 rounded-lg px-4 py-3 text-sm"
                role="alert"
              >
                <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 flex-shrink-0 mt-0.5">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M10 6v4M10 13h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!canSubmit}
              className="quintia-btn-primary w-full py-3 flex items-center justify-center gap-2.5"
            >
              {loading ? (
                <>
                  <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 animate-spin" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  <span>Starting Pipeline...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true">
                    <path d="M16.5 8.25L10 4.5 3.5 8.25v7.5L10 19.5l6.5-3.75v-7.5z" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 4.5v15" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M3.5 8.25L10 12l6.5-3.75" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <span>Analyze Process</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
