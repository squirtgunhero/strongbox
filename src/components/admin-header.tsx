"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Menu, Search, LogOut, Plus, UserCog, Settings } from "lucide-react";
import { signOut } from "@/app/(auth)/login/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAdminRouteMeta } from "@/components/admin-nav";
import { AdminBreadcrumb } from "@/components/admin-breadcrumb";

interface AdminHeaderProps {
  profile: { full_name: string; role: string };
  onMenuToggle: () => void;
  /** Title for detail pages shown in breadcrumb (e.g., property address) */
  detail?: string;
}

export function AdminHeader({ profile, onMenuToggle, detail }: AdminHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const routeMeta = getAdminRouteMeta(pathname);

  const initials =
    (profile.full_name || "")
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex min-h-[58px] w-full max-w-[1280px] items-center gap-3 px-6 sm:px-7 xl:px-8">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {routeMeta.section}
          </div>
          <div className="mt-0.5">
            <AdminBreadcrumb detail={detail} />
          </div>
        </div>

        <div className="flex-1" />

        <div className="hidden min-w-0 flex-1 max-w-[420px] min-[1100px]:block">
        <div className="flex items-center gap-2 rounded-xl bg-muted/50 px-3 py-2 text-muted-foreground transition focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="h-4 w-4" />
          <input
            type="text"
            aria-label="Search loans, borrowers, and properties"
            placeholder={routeMeta.description}
            className="flex-1 border-0 bg-transparent text-[13px] text-foreground outline-0 placeholder:text-muted-foreground"
          />
          <span className="mono rounded-md border bg-muted px-2 py-0.5 text-[10.5px] text-muted-foreground">
            ⌘K
          </span>
        </div>
      </div>

      <Button
        nativeButton={false}
        size="default"
        className="h-8 rounded-lg px-2 text-[12.5px] font-medium sm:px-3"
        render={<Link href="/admin/loans/new" />}
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">New loan</span>
      </Button>

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="default" className="h-8 gap-2 rounded-lg px-2.5" />
          }
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
            {initials}
          </span>
          <span className="hidden text-[13.5px] font-medium sm:inline">
            {profile.full_name}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-[12px] text-muted-foreground" disabled>
            {profile.role.replace(/_/g, " ")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push("/admin/users")}>
            <UserCog className="mr-2 h-4 w-4" />
            Users
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push("/admin/settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      </div>
    </header>
  );
}
