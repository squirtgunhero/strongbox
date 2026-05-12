import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface ActivityEntry {
  kind: "payment" | "draw" | "doc" | "stage" | "alert" | "system";
  who: string;
  text: string;
  at: string;
  href?: string;
}

const DOT_COLOR: Record<ActivityEntry["kind"], string> = {
  payment: "bg-[color:var(--status-success)]",
  stage: "bg-[color:var(--status-success)]",
  draw: "bg-[color:var(--status-info)]",
  doc: "bg-[color:var(--status-warning)]",
  alert: "bg-primary",
  system: "bg-muted-foreground",
};

interface ActivityFeedProps {
  entries: ActivityEntry[];
}

/**
 * Activity feed with a continuous vertical timeline rail. When empty,
 * shows skeleton-like placeholder rows with an explanation and a CTA.
 */
export function ActivityFeed({ entries }: ActivityFeedProps) {
  const isEmpty = entries.length === 0;

  return (
    <div className="rounded-2xl border bg-card shadow-[0_1px_0_rgba(15,17,21,0.04),0_2px_8px_-4px_rgba(15,17,21,0.06)] overflow-hidden">
      <div className="px-5 py-3.5 border-b flex items-center justify-between">
        <div>
          <div className="text-[13.5px] font-semibold tracking-tight">
            Activity
          </div>
          <div className="text-[11.5px] text-muted-foreground mt-0.5">
            Recent updates across your portfolio
          </div>
        </div>
        <Link
          href="/admin/audit"
          className="inline-flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground"
        >
          Audit log
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {isEmpty ? (
        <div className="relative px-5 py-5">
          {/* Vertical timeline rail */}
          <span className="absolute left-[26px] top-6 bottom-16 w-px bg-border" />
          <ul className="space-y-3 mb-5">
            {[0, 1, 2].map((i) => (
              <li
                key={i}
                className="grid grid-cols-[16px_1fr_auto] gap-3 items-center"
              >
                <span className="relative z-10 h-2 w-2 rounded-full bg-muted ring-4 ring-card" />
                <div className="flex-1 space-y-1.5">
                  <div
                    className="h-2 rounded bg-muted/80"
                    style={{ width: `${[70, 55, 80][i]}%` }}
                  />
                  <div
                    className="h-1.5 rounded bg-muted/50"
                    style={{ width: `${[45, 35, 60][i]}%` }}
                  />
                </div>
                <span className="h-1.5 w-10 rounded bg-muted/50" />
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/30 p-4">
            <div className="text-[13px] font-medium text-foreground">
              No recent activity yet
            </div>
            <p className="text-[12px] text-muted-foreground mt-1 leading-relaxed">
              Loan updates, draw requests, document changes, and approvals
              will appear here as your team works.
            </p>
            <Link
              href="/admin/audit"
              className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium text-foreground hover:text-primary"
            >
              View audit log
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Continuous rail */}
          <span className="absolute left-[27px] top-5 bottom-5 w-px bg-border" />
          <ul>
            {entries.map((entry, idx) => (
              <li key={idx}>
                <Link
                  href={entry.href || "#"}
                  className="relative grid grid-cols-[16px_1fr_auto] gap-3 items-center px-5 py-3 border-t first:border-t-0 hover:bg-muted/40 transition-colors"
                >
                  <span
                    className={`relative z-10 h-2 w-2 rounded-full ${DOT_COLOR[entry.kind]} ring-4 ring-card`}
                  />
                  <div className="text-[13px] min-w-0">
                    <div className="truncate">
                      <span className="font-medium mono text-[11.5px] text-muted-foreground mr-1.5">
                        {entry.who}
                      </span>
                      <span className="text-foreground">{entry.text}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground mono whitespace-nowrap">
                    {entry.at}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
