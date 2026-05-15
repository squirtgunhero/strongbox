import Link from "next/link";
import { ArrowRight, ChevronRight, type LucideIcon } from "lucide-react";
import {
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FileX,
  Hammer,
  MessagesSquare,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TodayRow {
  id: string;
  label: string;
  count: number;
  detail?: string;
  href: string;
  tone?: "high" | "med" | "low";
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
 * Today — consolidated attention panel. Each row has a 2px left-edge
 * priority stripe (red=high, amber=med, none=low). Sorted by tone+count.
 */
export function TodayPanel({
  rows,
  emptyMessage,
}: {
  rows: TodayRow[];
  emptyMessage?: string;
}) {
  const sorted = [...rows].sort((a, b) => {
    const order = { high: 0, med: 1, low: 2 } as const;
    return (
      (order[a.tone ?? "low"] ?? 2) - (order[b.tone ?? "low"] ?? 2) ||
      b.count - a.count
    );
  });

  return (
    <div className="flex min-w-0 flex-col rounded-2xl bg-card ring-1 ring-border/60 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between border-b px-4 py-3.5">
        <div>
          <div className="text-[14px] font-semibold tracking-[-0.01em]">
            Today
          </div>
          <div className="mt-0.5 text-[11.5px] text-muted-foreground">
            What needs your attention
          </div>
        </div>
        <Link
          href="/admin/notifications"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground"
        >
          Inbox <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {sorted.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="text-[13.5px] font-medium">All clear</div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            {emptyMessage ?? "Nothing urgent right now."}
          </p>
        </div>
      ) : (
        <ul className="divide-y">
          {sorted.map((row) => {
            const Icon = ICON_MAP[row.iconKind ?? "updates"] ?? ICON_MAP.updates;
            const tone = row.tone ?? "low";
            return (
              <li key={row.id} className="relative">
                <span
                  aria-hidden
                  className={cn(
                    "absolute inset-y-0 left-0 w-[2px]",
                    tone === "high" && "bg-primary",
                    tone === "med" && "bg-[color:var(--status-warning)]",
                    tone === "low" && "bg-transparent"
                  )}
                />
                <Link
                  href={row.href}
                  className="group grid grid-cols-[24px_1fr_auto_12px] items-center gap-2.5 px-4 py-2.5 transition-colors hover:bg-muted/40"
                >
                  <span
                    className={cn(
                      "grid h-6 w-6 place-items-center rounded-md",
                      tone === "high" && "bg-primary/10 text-primary",
                      tone === "med" &&
                        "bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]",
                      tone === "low" && "bg-muted text-muted-foreground"
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-medium leading-tight text-foreground">
                      {row.label}
                    </div>
                    {row.detail && (
                      <div className="mono mt-0.5 truncate text-[11px] text-muted-foreground">
                        {row.detail}
                      </div>
                    )}
                  </div>
                  <span
                    className={cn(
                      "tabular rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      tone === "high" && "bg-primary/10 text-primary",
                      tone === "med" &&
                        "bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]",
                      tone === "low" && "bg-muted text-foreground/80"
                    )}
                  >
                    {row.count}
                  </span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
