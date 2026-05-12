"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Search, LogOut } from "lucide-react";
import { signOut } from "@/app/(auth)/login/actions";
import { ThemeToggle } from "@/components/theme-toggle";

interface AdminHeaderProps {
  profile: { full_name: string; role: string };
}

export function AdminHeader({ profile }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex h-[52px] items-center gap-4 border-b border-border bg-background px-7">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <span className="text-foreground">StrongBox</span>
      </div>

      <div className="flex-1 max-w-[380px] flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-border bg-card text-muted-foreground">
        <Search className="h-3.5 w-3.5" />
        <input
          type="text"
          placeholder="Search loans, borrowers..."
          className="flex-1 bg-transparent border-0 outline-0 text-[13px] text-foreground placeholder:text-muted-foreground"
        />
        <span className="mono text-[10.5px] px-1.5 py-0.5 border border-border rounded text-muted-foreground bg-muted">
          ⌘K
        </span>
      </div>

      <div className="flex-1" />

      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="sm" className="gap-2" />}
        >
          <span className="text-sm">{profile.full_name}</span>
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
