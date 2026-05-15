import Link from "next/link";
import {
  Landmark,
  Percent,
  Gauge,
  Activity,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface KpiCell {
  label: string;
  value: string;
  delta?: { dir: "up" | "down" | "flat"; text: string };
  sub?: string;
  spark?: number[];
  /** Color the value/delta as a warning or danger to encode policy state. */
  tone?: "ok" | "warn" | "danger" | "neutral";
}

interface KpiStripProps {
  cells: KpiCell[];
}

/**
 * Per-label presentation: icon, drill-down link, and the "featured" flag
 * that fills the first card with the brand accent. Driven off the stable
 * KPI labels so the dashboard page doesn't have to thread icons through.
 */
const KPI_META: Record<
  string,
  { icon: LucideIcon; href: string; cta: string; featured?: boolean }
> = {
  Deployed: {
    icon: Landmark,
    href: "/admin/loans?status=active",
    cta: "View active book",
    featured: true,
  },
  "Weighted rate": {
    icon: Percent,
    href: "/admin/reports",
    cta: "Rate breakdown",
  },
  "Avg LTV (as-is)": {
    icon: Gauge,
    href: "/admin/loans",
    cta: "Collateral detail",
  },
  Performing: {
    icon: Activity,
    href: "/admin/servicing",
    cta: "Servicing queue",
  },
};

const FALLBACK_META = {
  icon: Activity,
  href: "/admin",
  cta: "View detail",
  featured: false,
} as const;

export function KpiStrip({ cells }: KpiStripProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cells.map((cell) => {
        const meta = KPI_META[cell.label] ?? FALLBACK_META;
        const featured = "featured" in meta && meta.featured;
        const Icon = meta.icon;

        return (
          <div
            key={cell.label}
            className={cn(
              "group flex flex-col rounded-2xl shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)]",
              featured
                ? "bg-primary text-primary-foreground"
                : "bg-card ring-1 ring-border/60"
            )}
          >
            <div className="flex flex-1 flex-col gap-3 p-5">
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-xl",
                    featured
                      ? "bg-white/15 text-primary-foreground"
                      : "bg-primary/10 text-primary"
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </div>
                {cell.delta && (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold tabular",
                      featured
                        ? "bg-white/15 text-primary-foreground"
                        : cell.delta.dir === "up"
                          ? "bg-[color:var(--status-success-bg)] text-[color:var(--status-success)]"
                          : cell.delta.dir === "down"
                            ? "bg-[color:var(--status-danger-bg)] text-[color:var(--status-danger)]"
                            : "bg-muted text-muted-foreground"
                    )}
                  >
                    {cell.delta.dir === "up"
                      ? "↑ "
                      : cell.delta.dir === "down"
                        ? "↓ "
                        : "→ "}
                    {cell.delta.text}
                  </span>
                )}
              </div>

              <div className="mt-1 flex flex-col gap-1">
                <div
                  className={cn(
                    "text-[12.5px] font-medium",
                    featured
                      ? "text-primary-foreground/80"
                      : "text-muted-foreground"
                  )}
                >
                  {cell.label}
                </div>
                <div
                  className={cn(
                    "tabular truncate text-[28px] font-semibold leading-[1.1] tracking-[-0.02em]",
                    !featured && cell.tone === "danger" && "text-[color:var(--status-danger)]",
                    !featured && cell.tone === "warn" && "text-[color:var(--status-warning)]"
                  )}
                >
                  {cell.value}
                </div>
                {cell.sub && (
                  <div
                    className={cn(
                      "truncate text-[11.5px]",
                      featured
                        ? "text-primary-foreground/70"
                        : "text-muted-foreground"
                    )}
                  >
                    {cell.sub}
                  </div>
                )}
              </div>
            </div>

            <Link
              href={meta.href}
              className={cn(
                "flex items-center justify-between rounded-b-2xl border-t px-5 py-3 text-[12px] font-medium transition-colors",
                featured
                  ? "border-white/15 text-primary-foreground/90 hover:bg-white/10"
                  : "border-border/60 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              {meta.cta}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
