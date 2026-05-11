"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  Building2,
  Settings,
  Landmark,
  Kanban,
  Banknote,
  Hammer,
  Briefcase,
  BarChart3,
  ShieldCheck,
  Bell,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

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

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/admin" className="flex items-center gap-2">
          <Landmark className="h-6 w-6" />
          <span className="text-lg font-bold">StrongBox</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.href === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActive}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
