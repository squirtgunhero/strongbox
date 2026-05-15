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
  UserCog,
} from "lucide-react";

type AdminNavItem = {
  title: string;
  href: string;
  description: string;
  icon: typeof LayoutDashboard;
};

type AdminNavSection = {
  label: string;
  items: AdminNavItem[];
};

export const adminNavSections: AdminNavSection[] = [
  {
    label: "Workspace",
    items: [
      {
        title: "Dashboard",
        href: "/admin",
        description: "Portfolio health, work queues, and critical activity.",
        icon: LayoutDashboard,
      },
      {
        title: "Pipeline",
        href: "/admin/pipeline",
        description: "Track applications from lead through approval.",
        icon: Kanban,
      },
      {
        title: "Servicing",
        href: "/admin/servicing",
        description: "Manage active loans, payments, and delinquencies.",
        icon: Banknote,
      },
      {
        title: "Draws",
        href: "/admin/draws",
        description: "Review requests, inspections, and draw disbursements.",
        icon: Hammer,
      },
    ],
  },
  {
    label: "Records",
    items: [
      {
        title: "Loans",
        href: "/admin/loans",
        description: "View and update loan records across all statuses.",
        icon: FileText,
      },
      {
        title: "Borrowers",
        href: "/admin/borrowers",
        description: "Manage borrower profiles and entity relationships.",
        icon: Users,
      },
      {
        title: "Investors",
        href: "/admin/investors",
        description: "Track investor accounts, commitments, and positions.",
        icon: Briefcase,
      },
      {
        title: "Properties",
        href: "/admin/properties",
        description: "Browse collateral data, valuation, and documents.",
        icon: Building2,
      },
    ],
  },
  {
    label: "Insights",
    items: [
      {
        title: "Reports",
        href: "/admin/reports",
        description: "Analyze production, performance, and risk trends.",
        icon: BarChart3,
      },
      {
        title: "Notifications",
        href: "/admin/notifications",
        description: "Review alerts, reminders, and queued system notices.",
        icon: Bell,
      },
      {
        title: "Audit Log",
        href: "/admin/audit",
        description: "Inspect immutable actions across the platform.",
        icon: ShieldCheck,
      },
      {
        title: "Users",
        href: "/admin/users",
        description: "Manage staff accounts, roles, and access.",
        icon: UserCog,
      },
      {
        title: "Settings",
        href: "/admin/settings",
        description: "Configure templates, users, and operating defaults.",
        icon: Settings,
      },
    ],
  },
];

function matchesPath(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  return pathname.startsWith(href);
}

export function getAdminRouteMeta(pathname: string): {
  section: string;
  title: string;
  description: string;
} {
  for (const section of adminNavSections) {
    for (const item of section.items) {
      if (matchesPath(pathname, item.href)) {
        return {
          section: section.label,
          title: item.title,
          description: item.description,
        };
      }
    }
  }

  return {
    section: "Workspace",
    title: "Admin",
    description: "Manage lending operations across the platform.",
  };
}
