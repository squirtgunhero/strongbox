"use client";

import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { reassignLoanOfficer } from "./officer-actions";

interface Staff {
  id: string;
  full_name: string;
}

export function OfficerSelect({
  loanId,
  currentOfficerId,
  staff,
}: {
  loanId: string;
  currentOfficerId: string | null;
  staff: Staff[];
}) {
  const [pending, setPending] = useState(false);

  async function handleChange(value: string | null) {
    if (!value) return;
    setPending(true);
    try {
      await reassignLoanOfficer(loanId, value === "unassigned" ? null : value);
    } finally {
      setPending(false);
    }
  }

  return (
    <Select
      value={currentOfficerId || "unassigned"}
      onValueChange={handleChange}
      disabled={pending}
    >
      <SelectTrigger className="h-7 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {staff.map((s) => (
          <SelectItem key={s.id} value={s.id}>
            {s.full_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
