"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Search, LogOut, Plus } from "lucide-react";
import { signOut } from "@/app/(auth)/login/actions";
import { ThemeToggle } from "@/components/theme-toggle";

interface AdminHeaderProps {
  profile: { full_name: string; role: string };
}

export function AdminHeader({ profile }: AdminHeaderProps) {
  const initials =
    (profile.full_name || "")
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
  return (
    <header className="sticky top-0 z-10 flex h-[56px] items-center gap-3 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 px-7">
      <div className="flex-1 max-w-[420px]">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background shadow-[var(--shadow-card)] text-muted-foreground focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition">
          <Search className="h-3.5 w-3.5" />
          <input
            type="text"
            placeholder="Search loans, borrowers, properties..."
            className="flex-1 bg-transparent border-0 outline-0 text-[13px] text-foreground placeholder:text-muted-foreground"
          />
          <span className="mono text-[10.5px] px-1.5 py-0.5 border rounded text-muted-foreground bg-muted">
            ⌘K
          </span>
        </div>
      </div>

      <div className="flex-1" />

      <Button
        nativeButton={false}
        size="sm"
        render={<Link href="/admin/loans/new" />}
      >
        <Plus className="h-3.5 w-3.5" />
        New loan
      </Button>

      <ThemeToggle />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="sm" className="gap-2 px-2.5" />
          }
        >
          <span className="h-7 w-7 rounded-full bg-primary/10 grid place-items-center text-[11px] font-semibold text-primary">
            {initials}
          </span>
          <span className="text-[13px] font-medium hidden sm:inline">
            {profile.full_name}
          </span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem className="text-xs text-muted-foreground" disabled>
            {profile.role}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
