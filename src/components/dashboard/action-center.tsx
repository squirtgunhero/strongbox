import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Clock3,
  FileX,
  Hammer,
} from "lucide-react";
import type { ComponentType } from "react";

interface ActionRow {
  id: string;
  title: string;
  description: string;
  cta: string;
  tone: "warn" | "danger" | "neutral";
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
  const items: ActionRow[] = [
    {
      id: "docs",
      title: rows.missingDocs > 0 ? `${rows.missingDocs} missing document conditions` : "No missing document conditions",
      description: "Conditions and document checklists waiting on borrower uploads.",
      cta: "Review",
      tone: rows.missingDocs > 0 ? "warn" : "neutral",
      href: "/admin/loans",
      icon: FileX,
    },
    {
      id: "draws",
      title: rows.drawRequests > 0 ? `${rows.drawRequests} draw requests need approval` : "No pending draw approvals",
      description: "Requests waiting on inspection confirmation and sign-off.",
      cta: "Approve",
      tone: rows.drawRequests > 0 ? "danger" : "neutral",
      href: "/admin/draws",
      icon: Hammer,
    },
    {
      id: "review",
      title: rows.needsReview > 0 ? `${rows.needsReview} loans in underwriting review` : "No underwriting reviews pending",
      description: "Files queued for underwriting decisions and condition updates.",
      cta: "View",
      tone: rows.needsReview > 0 ? "warn" : "neutral",
      href: "/admin/loans?status=underwriting",
      icon: Clock3,
    },
    {
      id: "maturity",
      title: rows.upcomingMaturities > 0 ? `${rows.upcomingMaturities} maturities inside 30 days` : "No maturities inside 30 days",
      description: "Start extension or payoff outreach with borrowers this week.",
      cta: "Contact",
      tone: rows.upcomingMaturities > 0 ? "danger" : "neutral",
      href: "/admin/servicing",
      icon: CalendarClock,
    },
  ];

  return (
    <div className="overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-card)]">
      <div className="flex min-h-[84px] items-center border-b px-7 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[21px] font-semibold tracking-[-0.02em]">This week</div>
            <div className="mt-1 text-[13px] text-muted-foreground">Servicing queue and operator priorities</div>
          </div>
          <AlertTriangle className="h-4 w-4 text-muted-foreground" />
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
                className={`group grid grid-cols-[42px_1fr_auto] items-center gap-4 border-t px-7 py-4.5 first:border-t-0 transition-colors hover:bg-muted/30 ${
                  item.tone === "danger" ? "bg-primary/[0.02]" : ""
                }`}
              >
                <div
                  className={`grid h-11 w-11 place-items-center rounded-xl ${tone.iconBg}`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold leading-tight">{item.title}</div>
                  <div className="mt-1 truncate text-[13px] text-muted-foreground">
                    {item.description}
                  </div>
                </div>
                <span
                  className={`inline-flex h-8 items-center rounded-lg border px-3 text-[11px] font-semibold uppercase tracking-[0.08em] ${tone.button}`}
                >
                  {item.cta}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="border-t px-7 py-3.5">
        <Link
          href="/admin/servicing"
          className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-foreground"
        >
          Open servicing queue
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
