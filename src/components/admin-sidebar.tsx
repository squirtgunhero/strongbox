"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Settings,
  Kanban,
  Banknote,
  Hammer,
  Briefcase,
  BarChart3,
  ShieldCheck,
  Bell,
} from "lucide-react";

const navItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Pipeline", href: "/admin/pipeline", icon: Kanban },
  { title: "Servicing", href: "/admin/servicing", icon: Banknote },
  { title: "Draws", href: "/admin/draws", icon: Hammer },
  { title: "Loans", href: "/admin/loans", icon: FileText },
  { title: "Borrowers", href: "/admin/borrowers", icon: Users },
  { title: "Investors", href: "/admin/investors", icon: Briefcase },
  { title: "Properties", href: "/admin/properties", icon: Building2 },
  { title: "Reports", href: "/admin/reports", icon: BarChart3 },
  { title: "Notifications", href: "/admin/notifications", icon: Bell },
  { title: "Audit Log", href: "/admin/audit", icon: ShieldCheck },
  { title: "Settings", href: "/admin/settings", icon: Settings },
];

interface AdminSidebarProps {
  profile: { full_name: string; role: string };
}

export function AdminSidebar({ profile }: AdminSidebarProps) {
  const pathname = usePathname();
  const initials = (profile.full_name || "")
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="w-[232px] shrink-0 border-r border-border bg-background flex flex-col h-screen sticky top-0">
      <div className="flex items-center gap-2.5 px-[18px] py-4">
        <span className="h-7 w-7 rounded-md bg-foreground text-background grid place-items-center mono text-[13px] font-semibold">
          S
        </span>
        <span className="font-semibold text-[15px] tracking-tight">
          StrongBox
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pt-2 pb-2">
        <div className="text-[10.5px] uppercase tracking-[0.06em] font-medium text-muted-foreground px-2.5 py-1.5">
          Platform
        </div>
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13.5px] font-medium transition-colors ${
                    isActive
                      ? "bg-card text-foreground border border-border shadow-[0_1px_0_rgba(0,0,0,0.04)]"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border p-2.5">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-md hover:bg-muted">
          <div className="h-7 w-7 rounded-full bg-muted border border-border grid place-items-center text-[11px] font-semibold text-muted-foreground">
            {initials || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium truncate">
              {profile.full_name}
            </div>
            <div className="text-[11px] text-muted-foreground truncate capitalize">
              {profile.role.replace(/_/g, " ")}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
