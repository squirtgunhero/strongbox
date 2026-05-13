import { TriangleAlert } from "lucide-react";
import type { ConcentrationReport } from "@/lib/calculations/concentration";

interface Props {
  report: ConcentrationReport;
}

/**
 * Dashboard banner shown only when concentration breaches are detected.
 * Quietly absent otherwise so the dashboard stays clean.
 */
export function ConcentrationBanner({ report }: Props) {
  if (report.breaches.length === 0) return null;

  return (
    <div className="flex items-start gap-3 rounded-xl border border-[color:var(--status-warning)]/30 bg-[color:var(--status-warning-bg)] px-4 py-3.5">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--status-warning)]" />
      <div className="min-w-0 flex-1">
        <div className="text-[12.5px] font-semibold text-foreground">
          Concentration alert
          <span className="ml-1.5 text-[11.5px] font-normal text-muted-foreground">
            {report.breaches.length} breach
            {report.breaches.length === 1 ? "" : "es"} of configured thresholds
          </span>
        </div>
        <ul className="mt-1 flex flex-col gap-0.5 text-[12px] text-muted-foreground">
          {report.breaches.slice(0, 4).map((b) => (
            <li key={`${b.kind}-${b.key}`} className="tabular flex items-baseline gap-1.5">
              <span className="text-foreground">{b.label}</span>
              <span className="text-[11px] uppercase tracking-[0.06em]">
                {b.kind === "borrower" ? "borrower" : "state"}
              </span>
              <span className="ml-auto">
                {(b.share * 100).toFixed(1)}% &nbsp;·&nbsp; limit{" "}
                {(b.threshold * 100).toFixed(0)}%
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
