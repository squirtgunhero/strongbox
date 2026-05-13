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
    <div className="inline-flex gap-0.5 rounded-lg border bg-card p-[2px] text-[12px]">
      <Link
        href="?scope=mine"
        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
          isMine
            ? "bg-[color:var(--bg-2)] text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        My loans
      </Link>
      <Link
        href="?scope=all"
        className={`rounded-md px-2.5 py-1 font-medium transition-colors ${
          !isMine
            ? "bg-[color:var(--bg-2)] text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        All loans
      </Link>
    </div>
  );
}
