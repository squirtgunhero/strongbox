"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

/**
 * Pill-style scope toggle — single bordered container, two buttons inside,
 * active button gets a muted background tint.
 */
export function DashboardScopeToggle({
  defaultMine,
}: {
  defaultMine: boolean;
}) {
  const params = useSearchParams();
  const explicitScope = params.get("scope");
  const isMine =
    explicitScope === "mine" || (explicitScope === null && defaultMine);

  return (
    <div className="inline-flex gap-1 rounded-xl border bg-card p-1 text-[13px] shadow-[var(--shadow-card)]">
      <Link
        href="?scope=mine"
        className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
          isMine
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        My loans
      </Link>
      <Link
        href="?scope=all"
        className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
          !isMine
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        All loans
      </Link>
    </div>
  );
}
