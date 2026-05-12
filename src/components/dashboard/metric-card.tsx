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
    <div className="relative flex min-h-[246px] flex-col gap-5 rounded-3xl border bg-card p-7 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between">
        <div className="text-[12px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </div>
        {Icon && (
          <div className="grid h-10 w-10 place-items-center rounded-xl border bg-muted/55 text-muted-foreground">
            <Icon className="h-4.5 w-4.5" />
          </div>
        )}
      </div>
      <div className="flex min-h-[58px] items-baseline gap-2.5">
        <div className="tabular text-[48px] font-semibold leading-none tracking-[-0.03em] text-foreground">
          {value}
        </div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 text-[14px] font-semibold tracking-tight",
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
      <div className="mt-auto flex min-h-[30px] items-center justify-between gap-3">
        {status && <StatusPill tone={status.tone}>{status.label}</StatusPill>}
        {sub && (
          <div className="truncate text-[14px] text-muted-foreground">
            {sub}
          </div>
        )}
      </div>
      {spark && spark.length > 0 ? (
        <div className="-mt-0.5 rounded-xl border bg-muted/25 px-3 py-2">
          <Sparkline data={spark} width={220} height={36} />
        </div>
      ) : (
        emptyRail && (
          <div className="relative h-[6px] overflow-hidden rounded-full bg-muted">
            <div className="absolute bottom-0 left-0 top-0 w-1/3 rounded-full bg-foreground/25" />
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
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold uppercase tracking-[0.05em]",
        toneStyles
      )}
    >
      <span className={cn("h-1 w-1 rounded-full", dotStyle)} />
      {children}
    </span>
  );
}
