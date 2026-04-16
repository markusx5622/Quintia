"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";

export default function ProjectDetailPage({ params }: { params: Promise<{ projectId: string }> }) {
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { projectId } = use(params);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((data) => { setProject(data); setLoading(false); });
  }, [projectId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 animate-pulse space-y-4">
        <div className="h-8 bg-quintia-surface rounded-lg w-48 opacity-60" />
        <div className="quintia-card h-32 opacity-40" />
      </div>
    );
  }

  if (project?.error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="quintia-card p-6 border-quintia-error/40 text-quintia-error text-sm">
          {project.error}
        </div>
      </div>
    );
  }

  const latestJob = project?.jobs?.[0];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="quintia-section-label mb-1">Project Detail</p>
          <h1 className="text-2xl font-bold text-quintia-text">{project.name}</h1>
        </div>
        <Link href="/projects" className="quintia-btn-secondary text-sm">
          ← All Projects
        </Link>
      </div>

      {/* Metadata */}
      <div className="quintia-card p-5 grid grid-cols-2 gap-6">
        <div>
          <p className="quintia-section-label mb-1">Status</p>
          <p className="text-quintia-text font-semibold capitalize">{project.status}</p>
        </div>
        <div>
          <p className="quintia-section-label mb-1">Created</p>
          <p className="text-quintia-text text-sm">{new Date(project.created_at).toLocaleString()}</p>
        </div>
      </div>

      {/* Job navigation */}
      {latestJob && (
        <div className="quintia-card p-5">
          <p className="quintia-section-label mb-3">Latest Pipeline Job</p>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-quintia-text text-sm font-semibold capitalize">
                {latestJob.status} · {(latestJob.current_stage ?? "").replace(/_/g, " ")}
              </p>
              <p className="text-quintia-text-secondary text-xs font-mono mt-0.5">{latestJob.id}</p>
            </div>
            <Link
              href={latestJob.status === "completed" ? `/results/${latestJob.id}` : `/pipeline/${latestJob.id}`}
              className="quintia-btn-primary text-sm"
            >
              {latestJob.status === "completed" ? "View Results" : "Track Progress"}
            </Link>
          </div>
        </div>
      )}

      {!latestJob && (
        <div className="quintia-card p-6 text-center">
          <p className="text-quintia-text-secondary text-sm mb-4">
            No pipeline job has been started for this project.
          </p>
          <Link href="/projects/new" className="quintia-btn-primary text-sm">
            Create New Analysis
          </Link>
        </div>
      )}
    </div>
  );
}
