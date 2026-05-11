"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/portal", label: "Loans" },
  { href: "/portal/payments", label: "Payments" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/notifications", label: "Notifications" },
  { href: "/portal/profile", label: "Profile" },
];

export function PortalNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {links.map((l) => {
        const isActive =
          l.href === "/portal" ? pathname === "/portal" : pathname.startsWith(l.href);
        const showBadge = l.href === "/portal/notifications" && unreadCount > 0;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "text-sm px-3 py-1.5 rounded-md transition-colors inline-flex items-center gap-1.5",
              isActive
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {l.label}
            {showBadge && (
              <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.5 min-w-[18px] text-center font-medium">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
