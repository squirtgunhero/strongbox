"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export function UsersFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const currentRole = params.get("role") || "all";
  const currentStatus = params.get("status") || "all";
  const currentSearch = params.get("q") || "";

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "all") p.set(k, v);
      else p.delete(k);
    }
    startTransition(() => {
      router.push(`/admin/users${p.toString() ? `?${p}` : ""}`);
    });
  }

  return (
    <div className="flex gap-2 items-end flex-wrap sm:gap-3">
      <div className="flex-1 min-w-full sm:w-[180px] sm:min-w-[240px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            defaultValue={currentSearch}
            placeholder="Search by name or email..."
            className="pl-9"
            onChange={(e) => update({ q: e.target.value })}
          />
        </div>
      </div>
      <div className="w-full sm:w-[180px]">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1">
          Role
        </div>
        <Select
          value={currentRole}
          onValueChange={(v) => v && update({ role: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="loan_officer">Loan officer</SelectItem>
            <SelectItem value="borrower">Borrower</SelectItem>
            <SelectItem value="investor">Investor</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="w-full sm:w-[180px]">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1">
          Status
        </div>
        <Select
          value={currentStatus}
          onValueChange={(v) => v && update({ status: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
            <SelectItem value="pending">Pending invite</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
