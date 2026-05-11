"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

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
    <div className="inline-flex rounded-md border bg-background overflow-hidden text-xs">
      <Link
        href="?scope=mine"
        className={`px-3 py-1.5 ${isMine ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
      >
        My loans
      </Link>
      <Link
        href="?scope=all"
        className={`px-3 py-1.5 ${!isMine ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
      >
        All loans
      </Link>
    </div>
  );
}
