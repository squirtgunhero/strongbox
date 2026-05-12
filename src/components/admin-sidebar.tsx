"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { adminNavSections } from "@/components/admin-nav";
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
        "fixed inset-y-0 left-0 z-40 flex h-screen w-[292px] shrink-0 flex-col border-r transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:z-auto lg:w-[282px]",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
      style={{
        background: "var(--sidebar)",
        borderColor: "var(--sidebar-border)",
        color: "var(--sidebar-foreground)",
      }}
    >
      {/* Logo block */}
      <div className="flex items-center gap-3 px-6 pb-5 pt-7">
        <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-primary shadow-[0_0_0_1px_rgba(255,255,255,0.08),0_12px_28px_-12px_oklch(0.55_0.22_25/0.8)]">
          <span className="mono text-[17px] font-bold text-white">S</span>
        </div>
        <div className="leading-tight">
          <div className="text-[17px] font-semibold tracking-tight text-white">
            StrongBox
          </div>
          <div className="text-[10.5px] font-medium uppercase tracking-[0.1em] text-white/45">
            Private Credit OS
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          className="ml-auto text-white/70 hover:bg-white/8 hover:text-white lg:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-3 pb-3">
        {adminNavSections.map((section, sIdx) => (
          <div
            key={section.label}
            className={cn(sIdx > 0 ? "mt-6 border-t border-white/[0.08] pt-5" : "")}
          >
            <div className="px-3 pb-2 text-[10.5px] font-medium uppercase tracking-[0.1em] text-white/40">
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
                      className={`group relative flex items-center gap-3 rounded-xl py-2.5 pl-4 pr-3 text-[14px] font-medium transition-colors ${
                        isActive
                          ? "bg-white/[0.09] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]"
                          : "text-white/68 hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-primary" />
                      )}
                      <item.icon
                        className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-primary" : "text-white/48 group-hover:text-white/80"}`}
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

      <div className="border-t p-4" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-3">
          <div className="grid h-10 w-10 place-items-center rounded-full border border-primary/30 bg-primary/15 text-[12px] font-semibold text-primary">
            {initials || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13.5px] font-medium text-white">
              {profile.full_name}
            </div>
            <div className="truncate text-[11px] capitalize text-white/52">
              {profile.role.replace(/_/g, " ")}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
