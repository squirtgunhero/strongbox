import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/utils";
import type { ComponentType, ReactNode } from "react";

interface StatCardProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: { dir: "up" | "down" | "flat"; text: string };
  spark?: number[];
  sparkStroke?: string;
  /** Render a soft destructive-tinted treatment for risk/attention metrics. */
  attention?: boolean;
  /** Display as an empty/awaiting state when the value is zero or absent. */
  empty?: boolean;
  emptyLabel?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
  spark,
  sparkStroke,
  attention,
  empty,
  emptyLabel,
}: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 flex flex-col gap-3 transition-shadow",
        "shadow-[var(--shadow-card)]",
        attention && "ring-1 ring-primary/20"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-medium text-muted-foreground tracking-tight">
          {label}
        </div>
        {Icon && (
          <div
            className={cn(
              "h-7 w-7 rounded-lg grid place-items-center",
              attention
                ? "bg-primary/10 text-primary"
                : "bg-muted text-muted-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <div
          className={cn(
            "tabular font-semibold leading-none tracking-[-0.025em]",
            empty
              ? "text-[24px] text-muted-foreground"
              : "text-[26px] text-foreground"
          )}
        >
          {empty ? emptyLabel || "—" : value}
        </div>
        {delta && !empty && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-medium",
              delta.dir === "up" && "text-[color:var(--status-success)]",
              delta.dir === "down" && "text-primary",
              delta.dir === "flat" && "text-muted-foreground"
            )}
          >
            {delta.dir === "up" ? "↑" : delta.dir === "down" ? "↓" : "→"}{" "}
            {delta.text}
          </span>
        )}
      </div>
      {sub && (
        <div className="text-[12px] text-muted-foreground">{sub}</div>
      )}
      {spark && spark.length > 0 && !empty && (
        <div className="-mb-1">
          <Sparkline data={spark} width={260} height={32} stroke={sparkStroke} />
        </div>
      )}
      {empty && (
        <div className="h-8 rounded-md border border-dashed border-border" />
      )}
    </div>
  );
}
