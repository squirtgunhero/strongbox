"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/investor", label: "Portfolio" },
  { href: "/investor/distributions", label: "Distributions" },
  { href: "/investor/documents", label: "Documents" },
  { href: "/investor/notifications", label: "Notifications" },
];

export function InvestorNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => {
        const isActive =
          l.href === "/investor"
            ? pathname === "/investor"
            : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "text-sm px-3 py-1.5 rounded-md transition-colors",
              isActive
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
