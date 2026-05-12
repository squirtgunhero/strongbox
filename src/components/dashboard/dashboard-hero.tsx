import Link from "next/link";
import { Plus, Workflow, Download, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatusItem {
  label: string;
  value: number | string;
  tone?: "neutral" | "ok" | "warn" | "danger";
}

interface DashboardHeroProps {
  title?: string;
  subtitle?: string;
  status?: StatusItem[];
  scopeToggle?: React.ReactNode;
}

/**
 * Dark hero header for the dashboard. Charcoal background, red glow,
 * dotted noise texture, system-status strip with live indicators.
 */
export function DashboardHero({
  title = "Dashboard",
  subtitle = "Monitor capital, pipeline, draws, maturities, and borrower activity.",
  status,
  scopeToggle,
}: DashboardHeroProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color:var(--charcoal-border)] bg-[color:var(--charcoal)] text-[color:var(--charcoal-fg)] shadow-[0_24px_60px_-32px_oklch(0_0_0/0.5)]">
      <div className="absolute inset-0 sb-glow pointer-events-none" />
      <div className="absolute inset-0 sb-noise pointer-events-none opacity-60" />

      <div className="relative px-7 pt-6 pb-5">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-2">
              <h1 className="text-[28px] font-semibold tracking-[-0.025em] leading-none text-white">
                {title}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md border border-primary/40 bg-primary/10 text-[10px] font-semibold uppercase tracking-[0.1em] text-primary">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-60" />
                  <span className="relative h-1.5 w-1.5 rounded-full bg-primary" />
                </span>
                Live
              </span>
            </div>
            <p className="text-[13.5px] text-[color:var(--charcoal-fg-2)] max-w-[640px]">
              {subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {scopeToggle}
            <Button
              nativeButton={false}
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/[0.08]"
              render={<Link href="/api/reports/loans.csv" target="_blank" />}
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </Button>
            <Button
              nativeButton={false}
              variant="outline"
              size="sm"
              className="border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08] hover:border-white/25"
              render={<Link href="/admin/pipeline" />}
            >
              View pipeline
            </Button>
            <Button
              nativeButton={false}
              size="sm"
              className="shadow-[0_8px_24px_-8px_oklch(0.56_0.23_26/0.6)]"
              render={<Link href="/admin/loans/new" />}
            >
              <Plus className="h-3.5 w-3.5" />
              New loan
            </Button>
          </div>
        </div>
      </div>

      {/* System status strip */}
      {status && status.length > 0 && (
        <div className="relative border-t border-white/[0.08] bg-black/20 px-7 py-3">
          <div className="flex items-center gap-6 flex-wrap text-[12px]">
            {status.map((s) => (
              <div key={s.label} className="inline-flex items-center gap-2">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    s.tone === "ok"
                      ? "bg-[color:var(--status-success)]"
                      : s.tone === "warn"
                        ? "bg-[color:var(--status-warning)]"
                        : s.tone === "danger"
                          ? "bg-primary"
                          : "bg-white/40"
                  }`}
                />
                <span className="text-white/55 uppercase tracking-[0.06em] text-[10.5px] font-medium">
                  {s.label}
                </span>
                <span className="tabular text-white font-medium">
                  {s.value}
                </span>
              </div>
            ))}
            <div className="ml-auto inline-flex items-center gap-2 text-white/40 text-[11px]">
              <Activity className="h-3 w-3" />
              <span className="mono">All systems operational</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
