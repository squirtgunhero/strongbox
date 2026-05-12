"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { formatCurrency, formatRate, borrowerDisplayName } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import { moveLoan } from "./pipeline-actions";
import { toast } from "sonner";

const PIPELINE_STAGES: LoanStatus[] = [
  "lead",
  "application",
  "underwriting",
  "approved",
  "funded",
];

// Allowed forward/backward moves match the loan-status-controls map
const ALLOWED_MOVES: Record<LoanStatus, LoanStatus[]> = {
  lead: ["application"],
  application: ["underwriting", "lead"],
  underwriting: ["approved", "application"],
  approved: ["funded", "underwriting"],
  funded: [],
  active: [],
  paid_off: [],
  defaulted: [],
  foreclosure: [],
};

interface PipelineLoan {
  id: string;
  status: LoanStatus;
  loan_amount: number;
  interest_rate: number;
  updated_at: string;
  property: {
    address_street: string;
    address_city: string;
  } | null;
  loan_borrowers: {
    is_primary: boolean;
    borrower: {
      borrower_type: string;
      first_name: string | null;
      last_name: string | null;
      entity_name: string | null;
    };
  }[];
}

export function PipelineBoard({ initialLoans }: { initialLoans: PipelineLoan[] }) {
  const [loans, setLoans] = useState(initialLoans);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<LoanStatus | null>(null);

  const byStage = PIPELINE_STAGES.reduce(
    (acc, s) => {
      acc[s] = loans.filter((l) => l.status === s);
      return acc;
    },
    {} as Record<LoanStatus, PipelineLoan[]>
  );

  function handleDragStart(loanId: string) {
    setDraggingId(loanId);
  }

  async function handleDrop(stage: LoanStatus) {
    if (!draggingId) return;
    const loan = loans.find((l) => l.id === draggingId);
    setDraggingId(null);
    setHoverStage(null);
    if (!loan) return;
    if (loan.status === stage) return;

    const allowed = ALLOWED_MOVES[loan.status]?.includes(stage);
    if (!allowed) {
      toast.error(
        `Cannot move from ${LOAN_STATUS_LABELS[loan.status]} to ${LOAN_STATUS_LABELS[stage]}`
      );
      return;
    }

    // Optimistic update
    setLoans((prev) =>
      prev.map((l) => (l.id === draggingId ? { ...l, status: stage } : l))
    );

    try {
      await moveLoan(draggingId, stage);
      toast.success(`Moved to ${LOAN_STATUS_LABELS[stage]}`);
    } catch (e) {
      // Roll back
      setLoans((prev) =>
        prev.map((l) =>
          l.id === draggingId ? { ...l, status: loan.status } : l
        )
      );
      toast.error(e instanceof Error ? e.message : "Failed to move loan");
    }
  }

  return (
    <div className="grid grid-cols-5 gap-3 min-w-0">
      {PIPELINE_STAGES.map((stage) => {
        const stageLoans = byStage[stage] || [];
        const total = stageLoans.reduce(
          (sum, l) => sum + Number(l.loan_amount),
          0
        );
        const isValidDropTarget =
          draggingId &&
          (() => {
            const draggedLoan = loans.find((l) => l.id === draggingId);
            return (
              draggedLoan &&
              draggedLoan.status !== stage &&
              ALLOWED_MOVES[draggedLoan.status]?.includes(stage)
            );
          })();
        const isHovered = hoverStage === stage;

        return (
          <div
            key={stage}
            className={`flex flex-col gap-2 min-w-0 min-h-[320px] rounded-xl p-2.5 transition-colors ${
              isHovered
                ? "bg-primary/5 outline outline-1 outline-dashed outline-primary"
                : "bg-muted"
            }`}
            onDragOver={(e) => {
              if (isValidDropTarget) {
                e.preventDefault();
                setHoverStage(stage);
              }
            }}
            onDragLeave={() => {
              if (hoverStage === stage) setHoverStage(null);
            }}
            onDrop={() => handleDrop(stage)}
          >
            <div className="flex items-center justify-between px-1.5 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="sb-h6">{LOAN_STATUS_LABELS[stage]}</span>
                <span className="mono text-[11px] text-muted-foreground bg-background px-1.5 py-px rounded-full border">
                  {stageLoans.length}
                </span>
              </div>
              <span className="mono text-[11px] text-muted-foreground">
                {total ? `$${(total / 1_000_000).toFixed(1)}M` : "—"}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {stageLoans.length === 0 ? (
                <div className="rounded-md border border-dashed bg-background py-5 text-center text-xs text-muted-foreground">
                  Drop here
                </div>
              ) : (
                stageLoans.map((loan) => {
                  const primary = loan.loan_borrowers?.find(
                    (lb) => lb.is_primary
                  );
                  const borrowerName = primary?.borrower
                    ? borrowerDisplayName(primary.borrower)
                    : "Unknown";
                  const propAddress = loan.property
                    ? `${loan.property.address_street}`
                    : "No property";
                  const propLocation = loan.property
                    ? `${loan.property.address_city}, ${loan.property.address_city ? "" : ""}`
                    : "";
                  const daysInStage = Math.floor(
                    (Date.now() - new Date(loan.updated_at).getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  const isDragging = draggingId === loan.id;
                  const shortId = loan.id.slice(0, 8).toUpperCase();

                  return (
                    <div
                      key={loan.id}
                      draggable
                      onDragStart={() => handleDragStart(loan.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setHoverStage(null);
                      }}
                      className={`${isDragging ? "opacity-40" : ""}`}
                    >
                      <Card className="p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow gap-2">
                        <Link
                          href={`/admin/loans/${loan.id}`}
                          className="block space-y-2"
                          draggable={false}
                          onClick={(e) => {
                            if (draggingId) e.preventDefault();
                          }}
                        >
                          <div className="flex justify-between items-center">
                            <span className="mono text-[10.5px] text-muted-foreground">
                              {shortId}
                            </span>
                            <span className="mono text-[10.5px] text-muted-foreground">
                              {daysInStage}d
                            </span>
                          </div>
                          <div className="text-[13px] font-medium leading-tight">
                            {propAddress}
                            {loan.property && (
                              <div className="text-xs text-muted-foreground font-normal">
                                {loan.property.address_city}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span>{borrowerName}</span>
                          </div>
                          <div className="flex items-center justify-between pt-0.5">
                            <span className="mono text-[13px] font-medium">
                              {formatCurrency(loan.loan_amount)}
                            </span>
                          </div>
                          {/* Hide legacy fields below */}
                          <div className="hidden">
                            {propLocation}
                            {formatRate(loan.interest_rate)}
                          </div>
                        </Link>
                      </Card>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
