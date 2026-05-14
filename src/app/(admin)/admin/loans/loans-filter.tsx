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

interface Staff {
  id: string;
  full_name: string;
}

export function LoansFilter({
  staff,
  tagOptions = [],
}: {
  staff: Staff[];
  tagOptions?: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const currentStatus = params.get("status") || "all";
  const currentOfficer = params.get("officer") || "all";
  const currentMaturity = params.get("maturity") || "all";
  const currentTag = params.get("tag") || "all";
  const currentSearch = params.get("q") || "";
  const mineActive = params.get("mine") === "1";

  function toggleMine() {
    const p = new URLSearchParams(params.toString());
    if (mineActive) {
      p.delete("mine");
    } else {
      p.set("mine", "1");
      p.delete("officer");
    }
    startTransition(() => {
      router.push(`/admin/loans${p.toString() ? `?${p}` : ""}`);
    });
  }

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
    <div className="flex gap-2 items-end flex-wrap sm:gap-3">
      <button
        onClick={toggleMine}
        className={`h-9 px-3 rounded-md border text-sm transition-colors ${
          mineActive
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-background border-input hover:bg-muted"
        }`}
      >
        Mine
      </button>
      <div className="flex-1 min-w-full sm:w-[180px] sm:min-w-[240px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            defaultValue={currentSearch}
            placeholder="Search by property or borrower..."
            className="pl-9"
            onChange={(e) => update({ q: e.target.value })}
          />
        </div>
      </div>
      <div className="w-full sm:w-[180px]">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1">Status</div>
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
      <div className="w-full sm:w-[180px]">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1">Officer</div>
        <Select
          value={currentOfficer}
          onValueChange={(v) => v && update({ officer: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any officer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any officer</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {staff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full sm:w-[180px]">
        <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1">Maturity</div>
        <Select
          value={currentMaturity}
          onValueChange={(v) => v && update({ maturity: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any maturity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any maturity</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="30">Maturing ≤30 days</SelectItem>
            <SelectItem value="60">Maturing ≤60 days</SelectItem>
            <SelectItem value="90">Maturing ≤90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {tagOptions.length > 0 && (
        <div className="w-full sm:w-[180px]">
          <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground mb-1">Tag</div>
          <Select
            value={currentTag}
            onValueChange={(v) => v && update({ tag: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Any tag" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any tag</SelectItem>
              {tagOptions.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
