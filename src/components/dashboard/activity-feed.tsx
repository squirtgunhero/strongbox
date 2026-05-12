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

export function ActivityFeed({ entries }: ActivityFeedProps) {
  const isEmpty = entries.length === 0;

  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex min-h-[84px] items-center justify-between border-b px-7 py-5">
        <div>
          <div className="text-[21px] font-semibold tracking-[-0.02em]">Borrower activity</div>
          <div className="mt-1 text-[13px] text-muted-foreground">Recent updates and servicing events</div>
        </div>
        <Link
          href="/admin/audit"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          Audit log
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {isEmpty ? (
        <div className="relative px-7 py-8">
          <span className="absolute bottom-10 left-[30px] top-10 w-px bg-border" />
          <div className="space-y-4">
            {[0, 1, 2].map((row) => (
              <div key={row} className="grid grid-cols-[14px_1fr] gap-3">
                <span className="relative z-10 mt-1 h-2.5 w-2.5 rounded-full bg-muted ring-4 ring-card" />
                <div className="space-y-2">
                  <div className="h-2 rounded bg-muted/80" style={{ width: `${88 - row * 10}%` }} />
                  <div className="h-2 rounded bg-muted/55" style={{ width: `${55 - row * 8}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-dashed bg-muted/30 px-4 py-4">
            <div className="text-[14px] font-medium">No borrower activity yet</div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Draw requests, payment events, and document actions will appear here with timeline context.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <span className="absolute bottom-6 left-[30px] top-6 w-px bg-border" />
          <ul className="divide-y">
            {entries.map((entry, idx) => (
            <li key={`${entry.kind}-${entry.who}-${idx}`}>
                <Link
                  href={entry.href || "#"}
                  className="grid grid-cols-[14px_1fr_auto] items-center gap-3 px-7 py-4.5 transition-colors hover:bg-muted/30"
                >
                  <span
                    className={`relative z-10 h-2.5 w-2.5 rounded-full ${DOT_COLOR[entry.kind]} ring-4 ring-card`}
                  />
                  <div className="min-w-0 text-[13px]">
                    <div className="truncate">
                      <span className="mr-1.5 font-semibold text-foreground">
                        {entry.who}
                      </span>
                      <span className="text-[12.5px] text-muted-foreground">{entry.text}</span>
                    </div>
                  </div>
                  <span className="whitespace-nowrap text-[11px] text-muted-foreground">
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
