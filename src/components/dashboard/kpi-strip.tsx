import { Sparkline } from "@/components/sparkline";
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
 * KPI strip — Mercury/Modern Treasury style. One bordered container with
 * internal hairline dividers. No card-per-metric chrome. Sparklines render
 * as a thin neutral line at the bottom of each cell, contained by overflow.
 */
export function KpiStrip({ cells }: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-xl border bg-card shadow-[var(--shadow-card)] xl:grid-cols-4">
      {cells.map((cell, i) => (
        <div
          key={cell.label}
          className={cn(
            "flex min-w-0 flex-col gap-1.5 overflow-hidden px-4 py-3.5 transition-colors hover:bg-muted/40",
            // hairline dividers between cells, but no border on first column rows
            i % 2 === 1 && "border-l",
            "xl:border-l",
            i === 0 && "xl:border-l-0",
            i < (cells.length - (cells.length % 2 || 2)) && "border-b xl:border-b-0"
          )}
        >
          <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
            {cell.label}
          </div>

          <div className="flex min-w-0 items-baseline gap-1.5 whitespace-nowrap">
            <div
              className={cn(
                "tabular shrink truncate text-[24px] font-semibold leading-[1.1] tracking-[-0.02em]",
                cell.tone === "danger" && "text-primary",
                cell.tone === "warn" && "text-[color:var(--status-warning)]"
              )}
            >
              {cell.value}
            </div>
            {cell.delta && (
              <span
                className={cn(
                  "shrink-0 text-[11.5px] font-medium tracking-[-0.005em]",
                  cell.delta.dir === "up" && "text-[color:var(--status-success)]",
                  cell.delta.dir === "down" && "text-primary",
                  cell.delta.dir === "flat" && "text-muted-foreground"
                )}
              >
                {cell.delta.dir === "up" ? "↑" : cell.delta.dir === "down" ? "↓" : "→"}
                {cell.delta.text}
              </span>
            )}
          </div>

          {cell.sub && (
            <div className="truncate text-[11px] text-muted-foreground">
              {cell.sub}
            </div>
          )}

          {cell.spark && cell.spark.length > 0 && (
            <div className="mt-1 -mx-0.5 h-[20px] w-full overflow-hidden opacity-60">
              <SparkSvg data={cell.spark} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Local wrapper that forces the sparkline to fill its container width.
function SparkSvg({ data }: { data: number[] }) {
  const w = 240;
  const h = 20;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? w / (data.length - 1) : w;
  const points = data
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / range) * (h - 2) - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="block h-full w-full"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={1.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// Keep importing Sparkline so we don't dead-import a file; the inline SVG is
// more reliable for percent-width containers but the export stays.
void Sparkline;
