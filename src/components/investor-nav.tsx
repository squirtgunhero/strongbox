"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const links = [
  { href: "/investor", label: "Portfolio" },
  { href: "/investor/distributions", label: "Distributions" },
  { href: "/investor/documents", label: "Documents" },
  { href: "/investor/notifications", label: "Notifications" },
];

export function InvestorNav({ unreadCount = 0 }: { unreadCount?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navLinks = links.map((l) => {
    const isActive =
      l.href === "/investor"
        ? pathname === "/investor"
        : pathname.startsWith(l.href);
    const showBadge =
      l.href === "/investor/notifications" && unreadCount > 0;
    return (
      <Link
        key={l.href}
        href={l.href}
        onClick={() => setOpen(false)}
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
  });

  return (
    <>
      <nav className="hidden items-center gap-1 md:flex">{navLinks}</nav>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle navigation"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </Button>
      {open && (
        <div className="absolute left-0 right-0 top-14 z-30 border-b bg-background px-6 py-3 md:hidden">
          <nav className="flex flex-col gap-1">{navLinks}</nav>
        </div>
      )}
    </>
  );
}
