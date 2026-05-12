import { Sparkline } from "@/components/sparkline";
import { cn } from "@/lib/utils";
import type { ComponentType, ReactNode } from "react";

interface BaseProps {
  icon?: ComponentType<{ className?: string }>;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  delta?: { dir: "up" | "down" | "flat"; text: string };
  /** Status pill rendered next to the value. */
  status?: { label: string; tone: "ok" | "warn" | "danger" | "neutral" };
  spark?: number[];
  /** Render a faint muted progress rail (used when there's no data yet). */
  emptyRail?: boolean;
}

/** White metric card. Compact, dense, status-aware. */
export function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
  status,
  spark,
  emptyRail,
}: BaseProps) {
  return (
    <div className="relative rounded-2xl border bg-card p-5 flex flex-col gap-3 shadow-[0_1px_0_rgba(15,17,21,0.04),0_2px_8px_-4px_rgba(15,17,21,0.06)]">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-muted-foreground">
          {label}
        </div>
        {Icon && (
          <div className="h-7 w-7 rounded-lg bg-muted text-muted-foreground grid place-items-center">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="flex items-baseline gap-2">
        <div className="tabular text-[28px] font-semibold tracking-[-0.025em] leading-none text-foreground">
          {value}
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold tracking-tight",
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
      <div className="flex items-center justify-between gap-3">
        {status && <StatusPill tone={status.tone}>{status.label}</StatusPill>}
        {sub && (
          <div className="text-[11.5px] text-muted-foreground truncate">
            {sub}
          </div>
        )}
      </div>
      {spark && spark.length > 0 ? (
        <Sparkline data={spark} width={280} height={28} />
      ) : (
        emptyRail && (
          <div className="relative h-[3px] rounded-full bg-muted overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1/4 rounded-full bg-foreground/20" />
          </div>
        )
      )}
    </div>
  );
}

/** Dark charcoal metric card with red accent — used for the first card to
 * give the row visual rhythm. */
export function DarkMetricCard({
  icon: Icon,
  label,
  value,
  sub,
  delta,
  status,
  spark,
  emptyRail,
}: BaseProps) {
  return (
    <div className="relative rounded-2xl border border-[color:var(--charcoal-border)] bg-[color:var(--charcoal)] text-[color:var(--charcoal-fg)] p-5 flex flex-col gap-3 overflow-hidden shadow-[0_24px_60px_-32px_oklch(0_0_0/0.5)]">
      {/* Red accent rail on the left edge */}
      <span className="absolute left-0 top-5 bottom-5 w-[3px] rounded-r-full bg-primary" />
      <div className="absolute inset-0 sb-noise opacity-50 pointer-events-none" />

      <div className="relative flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-white/55">
          {label}
        </div>
        {Icon && (
          <div className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/30 text-primary grid place-items-center">
            <Icon className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      <div className="relative flex items-baseline gap-2">
        <div className="tabular text-[28px] font-semibold tracking-[-0.025em] leading-none text-white">
          {value}
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[11px] font-semibold",
              delta.dir === "up" && "text-[color:var(--status-success)]",
              delta.dir === "down" && "text-primary",
              delta.dir === "flat" && "text-white/55"
            )}
          >
            {delta.dir === "up" ? "↑" : delta.dir === "down" ? "↓" : "→"}
            {delta.text}
          </span>
        )}
      </div>
      <div className="relative flex items-center justify-between gap-3">
        {status && <StatusPill tone={status.tone} dark>{status.label}</StatusPill>}
        {sub && (
          <div className="text-[11.5px] text-white/55 truncate">{sub}</div>
        )}
      </div>
      {spark && spark.length > 0 ? (
        <div className="relative">
          <Sparkline
            data={spark}
            width={280}
            height={28}
            stroke="oklch(0.56 0.23 26)"
          />
        </div>
      ) : (
        emptyRail && (
          <div className="relative h-[3px] rounded-full bg-white/10 overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1/4 rounded-full bg-primary/60" />
          </div>
        )
      )}
    </div>
  );
}

function StatusPill({
  tone,
  dark,
  children,
}: {
  tone: "ok" | "warn" | "danger" | "neutral";
  dark?: boolean;
  children: React.ReactNode;
}) {
  const toneStyles = dark
    ? {
        ok: "bg-[color:var(--status-success)]/15 text-[color:var(--status-success)] border-[color:var(--status-success)]/30",
        warn: "bg-[color:var(--status-warning)]/15 text-[color:var(--status-warning)] border-[color:var(--status-warning)]/30",
        danger: "bg-primary/15 text-primary border-primary/30",
        neutral: "bg-white/[0.06] text-white/65 border-white/15",
      }[tone]
    : {
        ok: "bg-[color:var(--status-success-bg)] text-[color:var(--status-success)] border-[color:var(--status-success)]/20",
        warn: "bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)] border-[color:var(--status-warning)]/20",
        danger: "bg-primary/10 text-primary border-primary/20",
        neutral: "bg-muted text-muted-foreground border-border",
      }[tone];
  const dotStyle =
    tone === "ok"
      ? "bg-[color:var(--status-success)]"
      : tone === "warn"
        ? "bg-[color:var(--status-warning)]"
        : tone === "danger"
          ? "bg-primary"
          : "bg-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[10.5px] font-medium border tracking-tight",
        toneStyles
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", dotStyle)} />
      {children}
    </span>
  );
}
