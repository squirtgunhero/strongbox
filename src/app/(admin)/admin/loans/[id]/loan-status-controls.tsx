"use client";

import { useState } from "react";
import { updateLoanStatus } from "../actions";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";

const VALID_TRANSITIONS: Record<LoanStatus, LoanStatus[]> = {
  lead: ["application"],
  application: ["underwriting", "lead"],
  underwriting: ["approved", "application"],
  approved: ["funded", "underwriting"],
  funded: ["active"],
  active: ["paid_off", "defaulted"],
  paid_off: [],
  defaulted: ["foreclosure", "active"],
  foreclosure: [],
};

interface LoanStatusControlsProps {
  loanId: string;
  currentStatus: string;
}

export function LoanStatusControls({
  loanId,
  currentStatus,
}: LoanStatusControlsProps) {
  const [loading, setLoading] = useState(false);
  const transitions = VALID_TRANSITIONS[currentStatus as LoanStatus] || [];

  if (transitions.length === 0) return null;

  async function handleChange(newStatus: string | null) {
    if (!newStatus) return;
    setLoading(true);
    try {
      await updateLoanStatus(loanId, newStatus);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select onValueChange={handleChange} disabled={loading}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Move to..." />
        </SelectTrigger>
        <SelectContent>
          {transitions.map((status) => (
            <SelectItem key={status} value={status}>
              {LOAN_STATUS_LABELS[status]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
