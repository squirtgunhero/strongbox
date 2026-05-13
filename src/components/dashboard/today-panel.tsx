import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileX,
  Hammer,
  MessagesSquare,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TodayRow {
  id: string;
  label: string;
  count: number;
  detail?: string;
  href: string;
  /** Visual priority: "high" rows get the red accent treatment. */
  tone?: "high" | "med" | "low";
  /** Icon family hint (falls back to a sensible default per id). */
  iconKind?:
    | "docs"
    | "approvals"
    | "payments"
    | "updates"
    | "servicing"
    | "draws"
    | "review"
    | "maturity";
}

interface TodayPanelProps {
  rows: TodayRow[];
  emptyMessage?: string;
}

const ICON_MAP: Record<NonNullable<TodayRow["iconKind"]>, LucideIcon> = {
  docs: FileX,
  approvals: CheckCircle2,
  payments: CircleDollarSign,
  updates: MessagesSquare,
  servicing: ShieldAlert,
  draws: Hammer,
  review: Clock3,
  maturity: CalendarClock,
};

/**
 * Today — single consolidated panel that replaces the previous
 * activity-feed + action-center + maturity-watch trio. One scannable list of
 * what needs operator attention right now, sorted by priority.
 */
export function TodayPanel({ rows, emptyMessage }: TodayPanelProps) {
  const sorted = [...rows].sort((a, b) => {
    const order = { high: 0, med: 1, low: 2 } as const;
    return (
      (order[a.tone ?? "low"] ?? 2) - (order[b.tone ?? "low"] ?? 2) ||
      b.count - a.count
    );
  });

  return (
    <div className="flex min-w-0 flex-col rounded-2xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b px-5 py-4">
        <div>
          <div className="text-[15px] font-semibold tracking-[-0.01em]">Today</div>
          <div className="mt-0.5 text-[12.5px] text-muted-foreground">
            What needs your attention
          </div>
        </div>
        <Link
          href="/admin/notifications"
          className="inline-flex items-center gap-1 text-[12.5px] font-medium text-muted-foreground hover:text-foreground"
        >
          Inbox
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="text-[13.5px] font-medium">All clear</div>
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            {emptyMessage ?? "Nothing urgent right now."}
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {sorted.map((row) => {
            const Icon = ICON_MAP[row.iconKind ?? "updates"] ?? ICON_MAP.updates;
            const tone = row.tone ?? "low";
            return (
              <li key={row.id}>
                <Link
                  href={row.href}
                  className="group grid grid-cols-[28px_1fr_auto_auto] items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/30"
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-lg",
                      tone === "high" && "bg-primary/10 text-primary",
                      tone === "med" &&
                        "bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]",
                      tone === "low" && "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[13px] font-medium text-foreground">
                      {row.label}
                    </div>
                    {row.detail && (
                      <div className="truncate text-[12px] text-muted-foreground">
                        {row.detail}
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      "tabular rounded-md px-1.5 text-[12px] font-semibold",
                      row.count > 0 ? "text-foreground" : "text-muted-foreground/60"
                    )}
                  >
                    {row.count}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
