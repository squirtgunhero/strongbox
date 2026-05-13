"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  recordInspection,
  approveDraw,
  disburseDraw,
  rejectDraw,
} from "@/lib/draws";
import { X } from "lucide-react";
import { requiresDualApproval } from "@/lib/calculations/holdback";

interface Draw {
  id: string;
  status: string;
  requested_amount: number;
  approved_amount: number | null;
  requested_at: string;
  inspection_completed_at: string | null;
  inspector_notes: string | null;
  funded_at: string | null;
  rejected_reason: string | null;
  notes: string | null;
  approvals?: { approver_id: string; approver?: { full_name: string } | null }[];
  line_items?: { description: string; amount: number }[];
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  requested: "outline",
  inspected: "secondary",
  approved: "default",
  funded: "default",
  rejected: "destructive",
};

export function DrawsSection({
  loanId,
  draws,
  rehabBudget,
  remainingHoldback,
  currentUserId,
  dualApprovalThreshold,
}: {
  loanId: string;
  draws: Draw[];
  rehabBudget: number;
  remainingHoldback: number;
  currentUserId: string;
  /** Configured `org_settings.dual_approval_threshold`. */
  dualApprovalThreshold: number;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Draws</span>
          <span className="text-xs font-normal text-muted-foreground">
            {formatCurrency(remainingHoldback)} remaining of{" "}
            {formatCurrency(rehabBudget)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {draws.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No draws requested yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Requested</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Approvals</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {draws.map((draw) => {
                const amt = draw.approved_amount ?? draw.requested_amount;
                const needsDual = requiresDualApproval(amt, dualApprovalThreshold);
                const approvalCount = draw.approvals?.length || 0;
                const userHasApproved = draw.approvals?.some(
                  (a) => a.approver_id === currentUserId
                );

                return (
                  <TableRow key={draw.id}>
                    <TableCell>{formatDate(draw.requested_at)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[draw.status]}>
                        {draw.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {draw.approved_amount ? (
                        <span className="font-medium">
                          {formatCurrency(draw.approved_amount)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">
                          {formatCurrency(draw.requested_amount)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {approvalCount}/{needsDual ? 2 : 1}
                      {needsDual && (
                        <span className="text-muted-foreground"> (dual)</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DrawActions
                        draw={draw}
                        userHasApproved={userHasApproved || false}
                        dualApprovalThreshold={dualApprovalThreshold}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function DrawActions({
  draw,
  userHasApproved,
  dualApprovalThreshold,
}: {
  draw: Draw;
  userHasApproved: boolean;
  dualApprovalThreshold: number;
}) {
  if (draw.status === "requested") {
    return (
      <div className="flex gap-1 justify-end">
        <InspectButton drawId={draw.id} />
        <RejectButton drawId={draw.id} />
      </div>
    );
  }
  if (draw.status === "inspected") {
    return (
      <div className="flex gap-1 justify-end">
        <ApproveButton
          drawId={draw.id}
          defaultAmount={draw.requested_amount}
          alreadyApproved={userHasApproved}
          dualApprovalThreshold={dualApprovalThreshold}
        />
        <RejectButton drawId={draw.id} />
      </div>
    );
  }
  if (draw.status === "approved") {
    return (
      <div className="flex gap-1 justify-end">
        <DisburseButton drawId={draw.id} />
        <RejectButton drawId={draw.id} />
      </div>
    );
  }
  return null;
}

function RejectButton({ drawId }: { drawId: string }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    if (!reason.trim()) {
      setError("Reason required");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await rejectDraw(drawId, reason);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="xs" variant="ghost" />}>
        <X className="h-3 w-3" />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Draw</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="reject_reason">Reason</Label>
          <Textarea
            id="reject_reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Inspection found work incomplete"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button
            onClick={handleSubmit}
            disabled={loading}
            variant="destructive"
            className="w-full"
          >
            {loading ? "Rejecting..." : "Reject Draw"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InspectButton({ drawId }: { drawId: string }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      await recordInspection(drawId, notes);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="xs" variant="outline" />}>
        Record Inspection
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Inspection</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="insp_notes">Inspection notes</Label>
          <Textarea
            id="insp_notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Submitting..." : "Mark Inspected"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ApproveButton({
  drawId,
  defaultAmount,
  alreadyApproved,
  dualApprovalThreshold,
}: {
  drawId: string;
  defaultAmount: number;
  alreadyApproved: boolean;
  dualApprovalThreshold: number;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(defaultAmount));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      await approveDraw(drawId, parseFloat(amount));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (alreadyApproved) {
    return <span className="text-xs text-muted-foreground">You approved</span>;
  }

  const needsDual = requiresDualApproval(
    parseFloat(amount) || 0,
    dualApprovalThreshold
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="xs" />}>Approve</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve Draw</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label htmlFor="appr_amount">Approved amount</Label>
          <Input
            id="appr_amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {needsDual && (
            <p className="text-xs text-muted-foreground">
              Amounts over {formatCurrency(dualApprovalThreshold)} require a
              second approver.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button onClick={handleSubmit} disabled={loading} className="w-full">
            {loading ? "Approving..." : "Approve"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DisburseButton({ drawId }: { drawId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      await disburseDraw(drawId);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="xs" variant="default" />}>
        Disburse
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Disbursement</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            This will mark the draw as funded and log the disbursement. ACH
            integration runs separately.
          </p>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Separator />
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1"
            >
              {loading ? "Disbursing..." : "Confirm Disbursement"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
