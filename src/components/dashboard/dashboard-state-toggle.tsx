"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "live", label: "Live data" },
  { id: "empty", label: "Empty state" },
  { id: "demo", label: "Demo portfolio" },
] as const;

export function DashboardStateToggle() {
  const params = useSearchParams();
  const active = params.get("view") || "live";

  const withView = (view: string): string => {
    const next = new URLSearchParams(params.toString());
    if (view === "live") {
      next.delete("view");
    } else {
      next.set("view", view);
    }
    const query = next.toString();
    return query ? `?${query}` : "?";
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-xl border bg-card p-1 shadow-[var(--shadow-card)]">
      <span className="px-2 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        View
      </span>
      {OPTIONS.map((option) => (
        <Link
          key={option.id}
          href={withView(option.id)}
          className={cn(
            "rounded-lg px-2.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] transition-colors",
            active === option.id
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {option.label}
        </Link>
      ))}
    </div>
  );
}
