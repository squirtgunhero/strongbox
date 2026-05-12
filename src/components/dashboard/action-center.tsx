import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Clock3,
  FileX,
  Hammer,
} from "lucide-react";

interface ActionRow {
  id: string;
  title: string;
  count?: number;
  timeLabel?: string;
  description: string;
  cta: string;
  tone: "warn" | "danger" | "neutral";
  href: string;
}

interface ActionCenterProps {
  rows: ActionRow[];
}

const TONE_STYLES = {
  warn: {
    iconBg: "bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]",
    button: "border-[color:var(--status-warning)]/30 bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)] hover:bg-[color:var(--status-warning-bg)]/70",
  },
  danger: {
    iconBg: "bg-primary/10 text-primary",
    button: "border-primary/25 bg-primary/10 text-primary hover:bg-primary/15",
  },
  neutral: {
    iconBg: "bg-muted text-muted-foreground",
    button: "border-border bg-background text-foreground hover:bg-muted",
  },
} as const;

export function ActionCenter({ rows }: ActionCenterProps) {
  const iconForRow = (id: string) => {
    switch (id) {
      case "docs":
        return FileX;
      case "draws":
        return Hammer;
      case "review":
        return Clock3;
      case "maturity":
        return CalendarClock;
      default:
        return AlertTriangle;
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex min-h-[78px] items-center border-b px-6 py-4.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[19px] font-semibold tracking-[-0.02em]">This week</div>
            <div className="mt-1 text-[13.5px] text-muted-foreground">Servicing queue and operator priorities</div>
          </div>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      <ul>
        {rows.map((item) => {
          const tone = TONE_STYLES[item.tone];
          const Icon = iconForRow(item.id);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={`group grid grid-cols-[42px_1fr_auto] items-center gap-4 border-t px-6 py-4 first:border-t-0 transition-colors hover:bg-muted/30 ${
                  item.tone === "danger" ? "bg-primary/[0.02]" : ""
                }`}
              >
                <div
                  className={`grid h-11 w-11 place-items-center rounded-xl ${tone.iconBg}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold leading-tight">
                    {item.title}
                    {typeof item.count === "number" && (
                      <span className="tabular ml-1.5 text-[13px] text-muted-foreground">
                        {item.count}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-[13.5px] text-muted-foreground">
                    {item.description}
                  </div>
                  {item.timeLabel && (
                    <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                      {item.timeLabel}
                    </div>
                  )}
                </div>
                <span
                  className={`inline-flex h-8 items-center rounded-lg border px-3 text-[10.5px] font-semibold uppercase tracking-[0.08em] ${tone.button}`}
                >
                  {item.cta}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t px-6 py-3.5">
        <Link
          href="/admin/servicing"
          className="inline-flex items-center gap-1 text-[13.5px] font-medium text-muted-foreground hover:text-foreground"
        >
          Open servicing queue
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
