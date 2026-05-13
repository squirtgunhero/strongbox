import Link from "next/link";
import { Download, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardContextStripProps {
  date: string;            // e.g. "Tuesday, May 12"
  who: string;             // e.g. "Reese Anand"
  context: { value: string; label: string }[];
  scopeToggle?: React.ReactNode;
  /** Show the action buttons (Export, New loan). The global header has a
   *  New loan button already — set this true only on the dashboard. */
  showActions?: boolean;
}

/**
 * Compact, single-line orientation strip. No giant headline. Date + who +
 * three inline counts is plenty of context for a returning operator. The
 * scope toggle and actions sit right-aligned.
 */
export function DashboardContextStrip({
  date,
  who,
  context,
  scopeToggle,
  showActions = true,
}: DashboardContextStripProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 pb-1">
      <div className="min-w-0">
        <div className="font-mono text-[11px] tracking-[0.04em] text-muted-foreground">
          {date} · {who}
        </div>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[15px] font-medium text-foreground tracking-[-0.01em]">
          {context.map((c, i) => (
            <span key={c.label} className="inline-flex items-baseline gap-2">
              {i > 0 && (
                <span className="text-muted-foreground/60 select-none">·</span>
              )}
              <span className="tabular font-semibold">{c.value}</span>
              <span className="font-normal text-muted-foreground">{c.label}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2">
        {scopeToggle}
        {showActions && (
          <>
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              className="h-8 rounded-lg"
              render={<Link href="/api/reports/loans.csv" target="_blank" />}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              nativeButton={false}
              size="sm"
              className="h-8 rounded-lg font-medium"
              render={<Link href="/admin/loans/new" />}
            >
              <Plus className="h-3.5 w-3.5" />
              New loan
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/* Tiny segmented scope toggle (My / All). Replaces the bordered card-style
 * one — Mercury-flat, fits inline next to the action buttons. */
export function ScopeSegmented({
  isMine,
}: {
  isMine: boolean;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border bg-card p-0.5 text-[12px]">
      <Link
        href="?scope=mine"
        className={cn(
          "rounded-md px-2.5 py-1 font-medium transition-colors",
          isMine
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        Mine
      </Link>
      <Link
        href="?scope=all"
        className={cn(
          "rounded-md px-2.5 py-1 font-medium transition-colors",
          !isMine
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        All
      </Link>
    </div>
  );
}
