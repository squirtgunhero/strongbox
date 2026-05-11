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
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";

export function LoansFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const currentStatus = params.get("status") || "all";
  const currentSearch = params.get("q") || "";

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "all") p.set(k, v);
      else p.delete(k);
    }
    startTransition(() => {
      router.push(`/admin/loans${p.toString() ? `?${p}` : ""}`);
    });
  }

  return (
    <div className="flex gap-3 items-end flex-wrap">
      <div className="flex-1 min-w-[240px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            defaultValue={currentSearch}
            placeholder="Search by property or borrower..."
            className="pl-9"
            onChange={(e) => {
              // Debounce isn't worth a hook here — relying on transition is fine.
              update({ q: e.target.value });
            }}
          />
        </div>
      </div>
      <div className="w-[200px]">
        <Select
          value={currentStatus}
          onValueChange={(v) => v && update({ status: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(LOAN_STATUS_LABELS) as LoanStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {LOAN_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
