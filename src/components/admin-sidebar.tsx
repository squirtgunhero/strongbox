"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { adminNavSections } from "@/components/admin-nav";
import { Wordmark } from "@/components/brand/wordmark";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AdminSidebarProps {
  profile: { full_name: string; role: string; email: string };
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ profile, isOpen, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const initials = (profile.full_name || profile.email || "")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex h-screen w-[250px] shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo block */}
      <div className="flex items-center gap-3 px-5 pb-6 pt-5">
        <Link href="/admin" className="flex min-w-0 flex-col gap-1">
          <Wordmark height={34} className="text-foreground" />
          <div className="pl-[2px] text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Hard Money Lending
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {adminNavSections.map((section, sIdx) => (
          <div
            key={section.label}
            className={cn(sIdx > 0 ? "mt-5 pt-3" : "")}
          >
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
              {section.label}
            </div>
            <ul className="flex flex-col gap-0.5">
              {section.items
                .filter(
                  (item) => item.href !== "/admin/users" && item.href !== "/admin/settings"
                )
                .map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-[var(--sidebar-foreground)] hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
                        )}
                      />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--sidebar-border)] p-3">
        <div className="flex items-center gap-2.5 rounded-xl px-3 py-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary">
            {initials || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium text-foreground">
              {profile.full_name}
            </div>
            <div className="truncate text-[11px] capitalize text-muted-foreground">
              {profile.role.replace(/_/g, " ")}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
