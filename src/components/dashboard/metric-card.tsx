import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/utils";
import type { ComponentType, ReactNode } from "react";

interface BaseProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: { dir: "up" | "down" | "flat"; text: string };
  status?: { label: string; tone: "ok" | "warn" | "danger" | "neutral" };
  spark?: number[];
  emptyRail?: boolean;
}

/**
 * Compact metric card. Single column of information, left-aligned, with the
 * sparkline as a subtle line at the bottom — no decorative borders, no
 * oversized status pills colliding with the value.
 */
export function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
  status,
  spark,
}: BaseProps) {
  const hasSpark = spark && spark.length > 0;
  const empty = value === "--" || value === "$0.00";
  return (
    <div className="group relative flex min-w-0 flex-col gap-3 rounded-2xl border bg-card px-5 pt-5 pb-4 shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <div className="text-[11px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <div
          className={cn(
            "tabular text-[30px] font-semibold leading-none tracking-[-0.025em]",
            empty ? "text-muted-foreground/55" : "text-foreground"
          )}
        >
          {value}
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[12px] font-medium",
              delta.dir === "up" && "text-[color:var(--status-success)]",
              delta.dir === "down" && "text-primary",
              delta.dir === "flat" && "text-muted-foreground"
            )}
          >
            {delta.dir === "up" ? "↑" : delta.dir === "down" ? "↓" : "→"}
            {delta.text}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 min-h-[18px]">
        {status ? (
          <StatusDot tone={status.tone}>{status.label}</StatusDot>
        ) : (
          <span />
        )}
        {sub && (
          <div className="truncate text-[12px] text-muted-foreground text-right">
            {sub}
          </div>
        )}
      </div>

      {hasSpark && (
        <div className="-mx-1 -mb-1 mt-1 h-[28px]">
          <Sparkline
            data={spark!}
            width={300}
            height={28}
            stroke="var(--muted-foreground)"
          />
        </div>
      )}
    </div>
  );
}

function StatusDot({
  tone,
  children,
}: {
  tone: "ok" | "warn" | "danger" | "neutral";
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-muted-foreground tracking-tight">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          tone === "ok" && "bg-[color:var(--status-success)]",
          tone === "warn" && "bg-[color:var(--status-warning)]",
          tone === "danger" && "bg-primary",
          tone === "neutral" && "bg-muted-foreground/50"
        )}
      />
      {children}
    </span>
  );
}

/* Kept for backwards compat — no longer used on the dashboard, but exported so
 * any other surface importing it doesn't break. */
export const DarkMetricCard = MetricCard;
