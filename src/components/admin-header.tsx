"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Menu, Search, LogOut, Plus } from "lucide-react";
import { signOut } from "@/app/(auth)/login/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { getAdminRouteMeta } from "@/components/admin-nav";

interface AdminHeaderProps {
  profile: { full_name: string; role: string };
  onMenuToggle: () => void;
}

export function AdminHeader({ profile, onMenuToggle }: AdminHeaderProps) {
  const pathname = usePathname();
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
    <header className="sticky top-0 z-20 border-b bg-background/96 shadow-[0_1px_0_rgba(18,22,28,0.05)] backdrop-blur">
      <div className="mx-auto flex min-h-[82px] w-full max-w-[1640px] items-center gap-4 px-5 sm:px-8 xl:px-12">
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
            {routeMeta.section}
          </div>
          <h1 className="mt-1 truncate text-[22px] font-semibold tracking-[-0.02em] text-foreground">
            {routeMeta.title}
          </h1>
        </div>

        <div className="hidden flex-1 min-[1100px]:block" />

        <div className="hidden min-w-0 flex-1 max-w-[620px] min-[1100px]:block">
        <div className="flex items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-muted-foreground shadow-[var(--shadow-card)] transition focus-within:border-primary/35 focus-within:ring-2 focus-within:ring-primary/20">
          <Search className="h-4 w-4" />
          <input
            type="text"
            aria-label="Search loans, borrowers, and properties"
            placeholder={routeMeta.description}
            className="flex-1 border-0 bg-transparent text-[13.5px] text-foreground outline-0 placeholder:text-muted-foreground"
          />
          <span className="mono rounded-md border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            ⌘K
          </span>
        </div>
      </div>

      <Button
        nativeButton={false}
        size="default"
        className="h-10 rounded-xl px-4 font-semibold shadow-[0_10px_28px_-12px_oklch(0.56_0.23_26/0.8)]"
        render={<Link href="/admin/loans/new" />}
      >
        <Plus className="h-4 w-4" />
        New loan
      </Button>

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="default" className="h-10 gap-2 rounded-xl px-3" />
          }
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-[12px] font-semibold text-primary">
            {initials}
          </span>
          <span className="hidden text-[13.5px] font-medium sm:inline">
            {profile.full_name}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
            {profile.role.replace(/_/g, " ")}
          </DropdownMenuItem>
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
