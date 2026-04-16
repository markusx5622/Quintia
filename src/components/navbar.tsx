"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/projects", label: "Projects" },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 h-14 bg-quintia-surface border-b border-quintia-border"
      aria-label="Main navigation"
    >
      <div className="max-w-screen-2xl mx-auto h-full px-6 flex items-center justify-between">
        {/* Wordmark */}
        <Link
          href="/projects"
          className="flex items-center gap-2.5 focus:outline-none focus:ring-2 focus:ring-quintia-primary rounded"
        >
          {/* Geometric mark */}
          <div className="w-7 h-7 rounded-md bg-quintia-primary flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
              <path
                d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <circle cx="8" cy="8" r="2" fill="white" />
            </svg>
          </div>
          <span className="text-quintia-text font-bold text-lg tracking-tight">
            QUINTIA
          </span>
          <span className="hidden sm:inline text-quintia-text-secondary text-xs font-medium tracking-widest uppercase border border-quintia-border px-2 py-0.5 rounded">
            Intelligence
          </span>
        </Link>

        {/* Navigation links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150
                  focus:outline-none focus:ring-2 focus:ring-quintia-primary
                  ${isActive
                    ? "bg-quintia-border text-quintia-text"
                    : "text-quintia-text-secondary hover:text-quintia-text hover:bg-quintia-border"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}

          <Link
            href="/projects/new"
            className="ml-3 quintia-btn-primary text-sm py-1.5 px-3"
          >
            + New Project
          </Link>
        </div>
      </div>
    </nav>
  );
}
