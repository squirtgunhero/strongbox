import Link from "next/link";
import {
  FileX,
  Hammer,
  ClipboardCheck,
  CalendarClock,
  ArrowRight,
} from "lucide-react";
import type { ComponentType } from "react";

interface ActionRow {
  id: string;
  label: string;
  count: number;
  description: string;
  tone: "ok" | "warn" | "danger" | "neutral";
  href: string;
  icon: ComponentType<{ className?: string }>;
}

interface ActionCenterProps {
  rows: {
    missingDocs: number;
    drawRequests: number;
    needsReview: number;
    upcomingMaturities: number;
  };
}

const TONE_STYLES = {
  ok: {
    iconBg: "bg-[color:var(--status-success-bg)] text-[color:var(--status-success)]",
    dot: "bg-[color:var(--status-success)]",
    pill: "text-[color:var(--status-success)]",
  },
  warn: {
    iconBg: "bg-[color:var(--status-warning-bg)] text-[color:var(--status-warning)]",
    dot: "bg-[color:var(--status-warning)]",
    pill: "text-[color:var(--status-warning)]",
  },
  danger: {
    iconBg: "bg-primary/10 text-primary",
    dot: "bg-primary",
    pill: "text-primary",
  },
  neutral: {
    iconBg: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground",
    pill: "text-muted-foreground",
  },
} as const;

export function ActionCenter({ rows }: ActionCenterProps) {
  const items: ActionRow[] = [
    {
      id: "docs",
      label: "Missing docs",
      count: rows.missingDocs,
      description: "Conditions still open across active loans",
      tone: rows.missingDocs > 0 ? "warn" : "neutral",
      href: "/admin/loans",
      icon: FileX,
    },
    {
      id: "draws",
      label: "Draw requests",
      count: rows.drawRequests,
      description: "Awaiting inspection or approval",
      tone: rows.drawRequests > 0 ? "danger" : "neutral",
      href: "/admin/draws",
      icon: Hammer,
    },
    {
      id: "review",
      label: "Needs review",
      count: rows.needsReview,
      description: "Loans pending underwriting sign-off",
      tone: rows.needsReview > 0 ? "warn" : "neutral",
      href: "/admin/loans?status=underwriting",
      icon: ClipboardCheck,
    },
    {
      id: "maturity",
      label: "Maturing this month",
      count: rows.upcomingMaturities,
      description: "Engage borrowers for refi or extension",
      tone: rows.upcomingMaturities > 0 ? "danger" : "neutral",
      href: "/admin/servicing",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="rounded-2xl border bg-card shadow-[0_1px_0_rgba(15,17,21,0.04),0_2px_8px_-4px_rgba(15,17,21,0.06)] overflow-hidden">
      <div className="px-5 py-3.5 border-b">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[13.5px] font-semibold tracking-tight">
              Today&apos;s priorities
            </div>
            <div className="text-[11.5px] text-muted-foreground mt-0.5">
              Action center
            </div>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Live
          </span>
        </div>
      </div>
      <ul>
        {items.map((item) => {
          const tone = TONE_STYLES[item.tone];
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group grid grid-cols-[36px_1fr_auto] gap-3 items-center px-5 py-3 border-t first:border-t-0 hover:bg-muted/40 transition-colors"
              >
                <div
                  className={`h-9 w-9 rounded-lg grid place-items-center ${tone.iconBg}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-medium leading-tight">
                    {item.label}
                  </div>
                  <div className="text-[11.5px] text-muted-foreground truncate mt-0.5">
                    {item.description}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`tabular text-[18px] font-semibold tracking-[-0.02em] ${item.count > 0 ? tone.pill : "text-muted-foreground/70"}`}
                  >
                    {item.count}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
