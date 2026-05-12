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
    <div className="inline-flex p-0.5 rounded-lg border bg-card text-[12px] gap-0.5">
      <Link
        href="?scope=mine"
        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
          isMine
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        My loans
      </Link>
      <Link
        href="?scope=all"
        className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
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
