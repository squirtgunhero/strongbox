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
    <div className="grid grid-cols-5 gap-4 min-w-0">
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
            className="flex flex-col gap-3 min-w-0"
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
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-semibold">
                {LOAN_STATUS_LABELS[stage]}
              </h3>
              <span className="text-xs text-muted-foreground">
                {stageLoans.length}
              </span>
            </div>
            <p className="text-xs text-muted-foreground -mt-2">
              {formatCurrency(total)}
            </p>
            <div
              className={`flex flex-col gap-2 min-h-[80px] rounded-md transition-colors ${
                isHovered
                  ? "ring-2 ring-primary/40 bg-primary/5"
                  : isValidDropTarget
                    ? "ring-1 ring-dashed ring-muted-foreground/40"
                    : ""
              }`}
            >
              {stageLoans.length === 0 ? (
                <div className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
                  Empty
                </div>
              ) : (
                stageLoans.map((loan) => {
                  const primary = loan.loan_borrowers?.find(
                    (lb) => lb.is_primary
                  );
                  const borrowerName = primary?.borrower
                    ? borrowerDisplayName(primary.borrower)
                    : "Unknown";
                  const address = loan.property
                    ? `${loan.property.address_street}, ${loan.property.address_city}`
                    : "No property";
                  const daysInStage = Math.floor(
                    (Date.now() - new Date(loan.updated_at).getTime()) /
                      (1000 * 60 * 60 * 24)
                  );
                  const isDragging = draggingId === loan.id;

                  return (
                    <div
                      key={loan.id}
                      draggable
                      onDragStart={() => handleDragStart(loan.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setHoverStage(null);
                      }}
                      className={`${isDragging ? "opacity-50" : ""}`}
                    >
                      <Card className="p-3 hover:bg-muted/50 transition-colors cursor-grab active:cursor-grabbing space-y-1.5">
                        <Link
                          href={`/admin/loans/${loan.id}`}
                          className="block"
                          draggable={false}
                          onClick={(e) => {
                            // Prevent navigation while dragging
                            if (draggingId) e.preventDefault();
                          }}
                        >
                          <div className="text-sm font-medium truncate">
                            {address}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {borrowerName}
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium">
                              {formatCurrency(loan.loan_amount)}
                            </span>
                            <span className="text-muted-foreground">
                              {formatRate(loan.interest_rate)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {daysInStage === 0
                              ? "today"
                              : `${daysInStage}d in stage`}
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
