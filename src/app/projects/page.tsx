"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Project {
  id: string;
  name: string;
  status: string;
  created_at: string;
  jobs?: { id: string; status: string; current_stage: string }[];
}

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  processing:  { label: "Processing",  classes: "bg-blue-500/20 text-blue-300 border-blue-500/40" },
  completed:   { label: "Completed",   classes: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" },
  draft:       { label: "Draft",       classes: "bg-gray-600/30 text-gray-400 border-gray-600/40" },
  failed:      { label: "Failed",      classes: "bg-red-500/20 text-red-300 border-red-500/40" },
  escalated:   { label: "Escalated",   classes: "bg-orange-500/20 text-orange-300 border-orange-500/40" },
};

function getLatestJob(project: Project) {
  return project.jobs?.[0] ?? null;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        setProjects(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      {/* Page header */}
      <div className="flex items-end justify-between mb-8">
        <div>
          <p className="quintia-section-label mb-1">Workspace</p>
          <h1 className="text-3xl font-bold text-quintia-text">Projects</h1>
        </div>
        <Link href="/projects/new" className="quintia-btn-primary">
          + New Project
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="quintia-card p-5 animate-pulse h-20 opacity-50" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="quintia-card flex flex-col items-center justify-center py-20 text-center">
          <svg viewBox="0 0 64 64" fill="none" className="w-16 h-16 text-quintia-border mb-4">
            <rect x="8" y="8" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
            <rect x="36" y="8" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
            <rect x="22" y="36" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="2" />
            <path d="M18 18h28M32 18v18" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
          </svg>
          <h2 className="text-xl font-semibold text-quintia-text mb-2">No projects yet</h2>
          <p className="text-quintia-text-secondary text-sm mb-6 max-w-sm">
            Create your first project to start analyzing business processes and computing financial impact.
          </p>
          <Link href="/projects/new" className="quintia-btn-primary">
            Create your first project
          </Link>
        </div>
      )}

      {/* Project grid */}
      {!loading && projects.length > 0 && (
        <div className="space-y-3">
          {projects.map((project, idx) => {
            const latestJob = getLatestJob(project);
            const statusKey = latestJob?.status ?? project.status ?? "draft";
            const statusCfg = STATUS_CONFIG[statusKey] ?? STATUS_CONFIG.draft;
            const jobId = latestJob?.id;
            const href = jobId
              ? latestJob?.status === "completed"
                ? `/results/${jobId}`
                : `/pipeline/${jobId}`
              : `/projects/${project.id}`;

            return (
              <div
                key={project.id}
                className={`
                  quintia-card p-5 flex items-center justify-between gap-4
                  hover:border-gray-600 transition-colors duration-200
                  animate-fade-in-up stagger-${Math.min(idx + 1, 5)}
                `}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-quintia-primary/20 border border-quintia-primary/30 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5 text-quintia-primary">
                      <path d="M4 5a1 1 0 011-1h10a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 11a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 11a1 1 0 00-1 1v4a1 1 0 001 1h1a1 1 0 001-1v-4a1 1 0 00-1-1h-1z" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-quintia-text font-semibold truncate">{project.name}</h2>
                    <p className="text-quintia-text-secondary text-xs mt-0.5">
                      Created {new Date(project.created_at).toLocaleString()}
                      {latestJob?.current_stage && statusKey === "processing" && (
                        <> · Stage: <span className="text-quintia-primary capitalize">{latestJob.current_stage.replace(/_/g, " ")}</span></>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`quintia-badge border ${statusCfg.classes}`}>
                    {statusCfg.label}
                  </span>
                  <Link
                    href={href}
                    className="quintia-btn-secondary text-sm py-1.5"
                    aria-label={`Open project ${project.name}`}
                  >
                    {latestJob?.status === "completed" ? "View Results" : latestJob ? "Track" : "Open"}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
