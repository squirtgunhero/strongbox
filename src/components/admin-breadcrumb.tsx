"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { adminNavSections } from "@/components/admin-nav";

interface AdminBreadcrumbProps {
  /** Title for detail pages (e.g., property address, borrower name) */
  detail?: string;
}

function resolveNavItem(pathname: string) {
  for (const section of adminNavSections) {
    for (const item of section.items) {
      const matches =
        item.href === "/admin"
          ? pathname === "/admin"
          : pathname.startsWith(item.href);
      if (matches) return { section: section.label, item };
    }
  }
  return null;
}

export function AdminBreadcrumb({ detail }: AdminBreadcrumbProps) {
  const pathname = usePathname();
  const match = resolveNavItem(pathname);

  if (!match) {
    return (
      <span className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
        Admin
      </span>
    );
  }

  const { item } = match;
  const isDetailPage = pathname !== item.href && pathname.startsWith(item.href);

  // Top-level page: just show the title (no link, it's the current page)
  if (!isDetailPage) {
    return (
      <span className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
        {item.title}
      </span>
    );
  }

  // Detail page: "Loans > 123 Main St"
  const detailLabel = detail || "Detail";

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
      <Link
        href={item.href}
        className="text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {item.title}
      </Link>
      <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
      <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-foreground">
        {detailLabel}
      </span>
    </nav>
  );
}
