"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import {
  createSignatureRequest,
  updateSignatureStatus,
} from "./signature-actions";
import { CheckCircle2, X, FileSignature } from "lucide-react";

interface SignatureRequest {
  id: string;
  document_type: string;
  status: string;
  signer_name: string;
  signer_email: string;
  sent_at: string | null;
  signed_at: string | null;
  declined_reason: string | null;
  created_at: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  term_sheet: "Term Sheet",
  promissory_note: "Promissory Note",
  personal_guarantee: "Personal Guarantee",
  deed_of_trust: "Deed of Trust",
  mortgage: "Mortgage",
  closing_package: "Closing Package",
  other: "Other",
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "secondary",
  viewed: "secondary",
  signed: "default",
  declined: "destructive",
  expired: "destructive",
};

export function SignaturesSection({
  loanId,
  requests,
  defaultSigner,
}: {
  loanId: string;
  requests: SignatureRequest[];
  defaultSigner: { id: string | null; name: string; email: string };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileSignature className="h-4 w-4" />
            E-Signature Requests
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Stub for DocuSeal/DocuSign integration. Tracks intent and outcomes.
          </p>
        </div>
        <NewRequestDialog loanId={loanId} defaultSigner={defaultSigner} />
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No signature requests yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Signer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Signed</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {DOC_TYPE_LABELS[r.document_type] || r.document_type}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{r.signer_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.signer_email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(r.sent_at)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(r.signed_at)}
                  </TableCell>
                  <TableCell>
                    <RequestActions request={r} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function NewRequestDialog({
  loanId,
  defaultSigner,
}: {
  loanId: string;
  defaultSigner: { id: string | null; name: string; email: string };
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError("");
    try {
      await createSignatureRequest(loanId, formData);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>New Request</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Signature Request</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-3">
          <input
            type="hidden"
            name="signer_borrower_id"
            value={defaultSigner.id || ""}
          />
          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select name="document_type" defaultValue="term_sheet">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DOC_TYPE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signer_name">Signer Name</Label>
            <Input
              id="signer_name"
              name="signer_name"
              defaultValue={defaultSigner.name}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signer_email">Signer Email</Label>
            <Input
              id="signer_email"
              name="signer_email"
              type="email"
              defaultValue={defaultSigner.email}
              required
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RequestActions({ request }: { request: SignatureRequest }) {
  const [loading, setLoading] = useState(false);

  async function setStatus(newStatus: "sent" | "signed" | "declined") {
    setLoading(true);
    try {
      await updateSignatureStatus(request.id, newStatus);
    } finally {
      setLoading(false);
    }
  }

  if (request.status === "draft") {
    return (
      <Button
        size="xs"
        variant="outline"
        disabled={loading}
        onClick={() => setStatus("sent")}
      >
        Mark Sent
      </Button>
    );
  }
  if (request.status === "sent" || request.status === "viewed") {
    return (
      <div className="flex gap-1">
        <Button
          size="xs"
          variant="default"
          disabled={loading}
          onClick={() => setStatus("signed")}
        >
          <CheckCircle2 className="h-3 w-3" />
        </Button>
        <Button
          size="xs"
          variant="ghost"
          disabled={loading}
          onClick={() => setStatus("declined")}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }
  return null;
}
