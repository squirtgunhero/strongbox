import Link from "next/link";
import {
  Building2,
  CalendarClock,
  FilePlus2,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  id: string;
  number: number;
  title: string;
  description: string;
  icon: LucideIcon;
  cta: string;
  href: string;
  done?: boolean;
  primary?: boolean;
}

const STEPS: OnboardingStep[] = [
  {
    id: "loan",
    number: 1,
    title: "Add your first loan",
    description: "Create a loan record to activate portfolio tracking, draws, and servicing.",
    icon: FilePlus2,
    cta: "Add loan",
    href: "/admin/loans/new",
    primary: true,
  },
  {
    id: "borrower",
    number: 2,
    title: "Import borrower contacts",
    description: "Upload borrowers and entities to build your operating book.",
    icon: Users,
    cta: "Import",
    href: "/admin/borrowers",
  },
  {
    id: "property",
    number: 3,
    title: "Add property collateral",
    description: "Enter as-is, ARV, and rehab values to unlock LTV monitoring.",
    icon: Building2,
    cta: "Add property",
    href: "/admin/properties",
  },
  {
    id: "team",
    number: 4,
    title: "Invite your team",
    description: "Assign underwriting and servicing responsibilities.",
    icon: UserPlus,
    cta: "Invite",
    href: "/admin/settings",
  },
  {
    id: "reminders",
    number: 5,
    title: "Configure servicing reminders",
    description: "Set payment, maturity, and draw reminder policies.",
    icon: CalendarClock,
    cta: "Configure",
    href: "/admin/settings",
  },
];

export function DashboardOnboarding({
  greeting,
}: {
  greeting: string;
}) {
  const total = STEPS.length;
  const done = STEPS.filter((s) => s.done).length;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold tracking-[-0.022em] leading-[1.15] text-foreground">
            {greeting}
          </h1>
          <p className="mt-1.5 max-w-[640px] text-[13.5px] text-muted-foreground">
            Welcome to StrongBox. Five steps and you'll have a complete operating
            book — capital, collateral, borrowers, and servicing — running from
            one place.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span className="tabular font-medium text-foreground">
            {done}/{total}
          </span>
          <span>complete</span>
          <div className="ml-2 h-1.5 w-32 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card ring-1 ring-border/60 shadow-[var(--shadow-card)]">
        <ul className="divide-y">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.id}>
                <Link
                  href={step.href}
                  className="group grid grid-cols-[36px_36px_1fr_auto] items-center gap-4 px-6 py-5 transition-colors hover:bg-muted/30"
                >
                  <span
                    className={cn(
                      "tabular grid h-7 w-7 place-items-center rounded-full text-[12.5px] font-semibold",
                      step.done
                        ? "bg-[color:var(--status-success)] text-white"
                        : step.primary
                          ? "bg-primary text-primary-foreground"
                          : "border bg-background text-muted-foreground"
                    )}
                  >
                    {step.done ? "✓" : step.number}
                  </span>
                  <span
                    className={cn(
                      "grid h-9 w-9 place-items-center rounded-xl border",
                      step.primary
                        ? "border-primary/20 bg-primary/5 text-primary"
                        : "bg-muted/40 text-muted-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold leading-tight text-foreground">
                      {step.title}
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  <Button
                    nativeButton={false}
                    variant={step.primary ? "default" : "outline"}
                    size="sm"
                    className="font-medium"
                    render={<span />}
                  >
                    {step.cta}
                  </Button>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
