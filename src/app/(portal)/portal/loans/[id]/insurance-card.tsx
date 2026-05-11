"use client";

import { useState, useActionState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateInsurance } from "./insurance-actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";

interface InsuranceData {
  insurance_carrier: string | null;
  insurance_policy_number: string | null;
  insurance_coverage_amount: number | null;
  insurance_expiration_date: string | null;
  insurance_agent_name: string | null;
  insurance_agent_email: string | null;
  insurance_agent_phone: string | null;
  insurance_updated_at: string | null;
}

export function InsuranceCard({
  loanId,
  insurance,
}: {
  loanId: string;
  insurance: InsuranceData;
}) {
  const [editing, setEditing] = useState(false);
  const [status, action, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await updateInsurance(loanId, formData);
        setEditing(false);
        return "Saved";
      } catch (e) {
        return e instanceof Error ? e.message : "Failed";
      }
    },
    null
  );

  const hasInsurance = !!insurance.insurance_carrier;
  const expirationDate = insurance.insurance_expiration_date
    ? new Date(insurance.insurance_expiration_date + "T00:00:00Z")
    : null;
  const daysUntilExpiration = expirationDate
    ? Math.ceil((expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;
  const expiringSoon =
    daysUntilExpiration !== null && daysUntilExpiration < 30;
  const expired =
    daysUntilExpiration !== null && daysUntilExpiration < 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Hazard Insurance
          {hasInsurance && !expired && !expiringSoon && (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          {(expired || expiringSoon) && (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          )}
        </CardTitle>
        {!editing && (
          <Button
            size="xs"
            variant="outline"
            onClick={() => setEditing(true)}
          >
            {hasInsurance ? "Update" : "Add"}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {editing ? (
          <form action={action} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="carrier">Carrier</Label>
                <Input
                  id="carrier"
                  name="carrier"
                  defaultValue={insurance.insurance_carrier || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policy_number">Policy Number</Label>
                <Input
                  id="policy_number"
                  name="policy_number"
                  defaultValue={insurance.insurance_policy_number || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverage_amount">Coverage Amount</Label>
                <Input
                  id="coverage_amount"
                  name="coverage_amount"
                  type="number"
                  step="0.01"
                  defaultValue={insurance.insurance_coverage_amount || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiration_date">Expiration Date</Label>
                <Input
                  id="expiration_date"
                  name="expiration_date"
                  type="date"
                  defaultValue={insurance.insurance_expiration_date || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent_name">Agent Name</Label>
                <Input
                  id="agent_name"
                  name="agent_name"
                  defaultValue={insurance.insurance_agent_name || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent_email">Agent Email</Label>
                <Input
                  id="agent_email"
                  name="agent_email"
                  type="email"
                  defaultValue={insurance.insurance_agent_email || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent_phone">Agent Phone</Label>
                <Input
                  id="agent_phone"
                  name="agent_phone"
                  type="tel"
                  defaultValue={insurance.insurance_agent_phone || ""}
                />
              </div>
            </div>
            {status && status !== "Saved" && (
              <p className="text-sm text-destructive">{status}</p>
            )}
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : !hasInsurance ? (
          <p className="text-sm text-muted-foreground py-2">
            No insurance information on file. Click <strong>Add</strong> to
            provide it.
          </p>
        ) : (
          <div className="space-y-2 text-sm">
            <Row label="Carrier" value={insurance.insurance_carrier} />
            <Row
              label="Policy Number"
              value={insurance.insurance_policy_number}
            />
            <Row
              label="Coverage"
              value={formatCurrency(insurance.insurance_coverage_amount)}
            />
            <Row
              label="Expires"
              value={formatDate(insurance.insurance_expiration_date)}
              highlight={expired || expiringSoon}
              hint={
                expired
                  ? "Policy expired"
                  : expiringSoon
                    ? `Expires in ${daysUntilExpiration} days`
                    : null
              }
            />
            {insurance.insurance_agent_name && (
              <Row label="Agent" value={insurance.insurance_agent_name} />
            )}
            {insurance.insurance_agent_email && (
              <Row label="Agent Email" value={insurance.insurance_agent_email} />
            )}
            {insurance.insurance_agent_phone && (
              <Row label="Agent Phone" value={insurance.insurance_agent_phone} />
            )}
            {insurance.insurance_updated_at && (
              <p className="text-xs text-muted-foreground pt-1">
                Last updated {formatDate(insurance.insurance_updated_at)}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({
  label,
  value,
  highlight,
  hint,
}: {
  label: string;
  value: string | null;
  highlight?: boolean;
  hint?: string | null;
}) {
  return (
    <div className="flex justify-between items-baseline">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={`text-right ${highlight ? "text-destructive font-medium" : "font-medium"}`}
      >
        {value || "--"}
        {hint && (
          <span className="block text-xs font-normal">{hint}</span>
        )}
      </span>
    </div>
  );
}
