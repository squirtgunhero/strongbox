"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { propertyAddress } from "@/lib/format";

interface LoanOption {
  id: string;
  property: {
    address_street: string;
    address_city: string;
    address_state: string;
    address_zip: string;
  } | null;
}

export function PaymentsFilter({ loans }: { loans: LoanOption[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const currentLoan = params.get("loan") || "all";
  const currentType = params.get("type") || "all";

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "all") p.set(k, v);
      else p.delete(k);
    }
    startTransition(() => {
      router.push(`/portal/payments${p.toString() ? `?${p}` : ""}`);
    });
  }

  return (
    <div className="flex gap-3 flex-wrap">
      <div className="w-[260px]">
        <Select
          value={currentLoan}
          onValueChange={(v) => v && update({ loan: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All loans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All loans</SelectItem>
            {loans.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.property ? propertyAddress(l.property) : l.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-[180px]">
        <Select
          value={currentType}
          onValueChange={(v) => v && update({ type: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any type</SelectItem>
            <SelectItem value="interest">Interest</SelectItem>
            <SelectItem value="principal">Principal</SelectItem>
            <SelectItem value="late_fee">Late Fee</SelectItem>
            <SelectItem value="default_interest">Default Interest</SelectItem>
            <SelectItem value="payoff">Payoff</SelectItem>
            <SelectItem value="escrow">Escrow</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
