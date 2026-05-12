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

const sections: {
  label: string;
  items: { title: string; href: string; icon: typeof LayoutDashboard }[];
}[] = [
  {
    label: "Operations",
    items: [
      { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { title: "Pipeline", href: "/admin/pipeline", icon: Kanban },
      { title: "Servicing", href: "/admin/servicing", icon: Banknote },
      { title: "Draws", href: "/admin/draws", icon: Hammer },
    ],
  },
  {
    label: "Records",
    items: [
      { title: "Loans", href: "/admin/loans", icon: FileText },
      { title: "Borrowers", href: "/admin/borrowers", icon: Users },
      { title: "Investors", href: "/admin/investors", icon: Briefcase },
      { title: "Properties", href: "/admin/properties", icon: Building2 },
    ],
  },
  {
    label: "Insights",
    items: [
      { title: "Reports", href: "/admin/reports", icon: BarChart3 },
      { title: "Notifications", href: "/admin/notifications", icon: Bell },
      { title: "Audit Log", href: "/admin/audit", icon: ShieldCheck },
      { title: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  profile: { full_name: string; role: string; email: string };
}

export function AdminSidebar({ profile }: AdminSidebarProps) {
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
      className="w-[244px] shrink-0 flex flex-col h-screen sticky top-0 border-r"
      style={{
        background: "var(--sidebar)",
        borderColor: "var(--sidebar-border)",
        color: "var(--sidebar-foreground)",
      }}
    >
      {/* Logo block */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-2.5">
        <div className="relative h-8 w-8 rounded-lg bg-primary grid place-items-center shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_8px_20px_-8px_oklch(0.55_0.22_25/0.6)]">
          <span className="text-white font-bold text-[15px] mono">S</span>
        </div>
        <div className="leading-tight">
          <div className="font-semibold tracking-tight text-[15px] text-white">
            StrongBox
          </div>
          <div className="text-[10.5px] uppercase tracking-[0.08em] text-white/45 font-medium">
            Lending OS
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 pb-2 mt-1">
        {sections.map((section, sIdx) => (
          <div key={section.label} className={sIdx > 0 ? "mt-5" : ""}>
            <div className="px-2.5 py-1.5 text-[10.5px] uppercase tracking-[0.08em] font-medium text-white/40">
              {section.label}
            </div>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`group relative flex items-center gap-2.5 pl-[14px] pr-2.5 py-[7.5px] rounded-md text-[13px] font-medium transition-colors ${
                        isActive
                          ? "text-white bg-white/[0.06]"
                          : "text-white/65 hover:text-white hover:bg-white/[0.04]"
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-primary" />
                      )}
                      <item.icon
                        className={`h-[15px] w-[15px] shrink-0 transition-colors ${isActive ? "text-primary" : "text-white/50 group-hover:text-white/75"}`}
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

      <div className="border-t p-3" style={{ borderColor: "var(--sidebar-border)" }}>
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/[0.04]">
          <div className="h-8 w-8 rounded-full bg-primary/20 border border-primary/30 grid place-items-center text-[11.5px] font-semibold text-primary">
            {initials || "U"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-white truncate">
              {profile.full_name}
            </div>
            <div className="text-[11px] text-white/50 truncate capitalize">
              {profile.role.replace(/_/g, " ")}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
