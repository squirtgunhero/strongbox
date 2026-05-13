"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorCardProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
}

/**
 * Friendly per-segment error UI rendered by Next's error.tsx boundary.
 * Keeps the sidebar/header chrome intact so the user can navigate elsewhere
 * even if this view crashed.
 */
export function ErrorCard({
  error,
  reset,
  title = "Couldn't load this view",
}: ErrorCardProps) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          StrongBox · error
        </div>
        <h1 className="mt-1 text-[18px] font-semibold tracking-[-0.015em]">
          {title}
        </h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          Something failed while rendering this page. Try again — if it keeps
          happening, share the error ID with support.
        </p>
        {error.digest && (
          <div className="mono mt-3 text-[11px] text-muted-foreground">
            Error ID: {error.digest}
          </div>
        )}
        <button
          onClick={() => reset()}
          className="mt-5 inline-flex h-9 items-center gap-1.5 rounded-md bg-foreground px-3.5 text-[12.5px] font-medium text-background hover:opacity-90"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Try again
        </button>
      </div>
    </div>
  );
}
