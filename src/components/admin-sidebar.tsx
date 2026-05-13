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
        "fixed inset-y-0 left-0 z-40 flex h-screen w-[240px] shrink-0 flex-col border-r bg-background transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Logo block */}
      <div className="flex items-center gap-3 px-4 pb-5 pt-5">
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

      <nav className="mt-1 flex-1 overflow-y-auto px-2 pb-3">
        {adminNavSections.map((section, sIdx) => (
          <div
            key={section.label}
            className={cn(sIdx > 0 ? "mt-4 pt-3" : "")}
          >
            <div className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {section.label === "Insights" ? "Intelligence" : section.label}
            </div>
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={`group relative flex items-center gap-2.5 rounded-lg py-2 pl-3 pr-2.5 text-[13px] font-medium transition-colors ${
                        isActive
                          ? "border border-border bg-card text-foreground shadow-[var(--shadow-sm)]"
                          : "text-[color:var(--text-2)] hover:bg-[color:var(--bg-2)] hover:text-foreground"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <item.icon
                        className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"}`}
                      />
                      <span className="truncate tracking-[-0.01em]">{item.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-2.5 rounded-lg border bg-card px-2.5 py-2.5">
          <div className="grid h-8 w-8 place-items-center rounded-full border bg-muted text-[11px] font-semibold text-muted-foreground">
            {initials || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[12.5px] font-medium text-foreground">
              {profile.full_name}
            </div>
            <div className="truncate text-[10.5px] capitalize text-muted-foreground">
              {profile.role.replace(/_/g, " ")}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
