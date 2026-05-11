import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function InsuranceDisplay({ insurance }: { insurance: InsuranceData }) {
  const hasInsurance = !!insurance.insurance_carrier;
  const expirationDate = insurance.insurance_expiration_date
    ? new Date(insurance.insurance_expiration_date + "T00:00:00Z")
    : null;
  const daysUntilExpiration = expirationDate
    ? Math.ceil(
        (expirationDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null;
  const expired = daysUntilExpiration !== null && daysUntilExpiration < 0;
  const expiringSoon =
    daysUntilExpiration !== null &&
    daysUntilExpiration >= 0 &&
    daysUntilExpiration < 30;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Hazard Insurance
          {hasInsurance && !expired && !expiringSoon && (
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          )}
          {(expired || expiringSoon) && (
            <Badge variant="destructive" className="text-xs">
              {expired
                ? "Expired"
                : `Expires in ${daysUntilExpiration} days`}
            </Badge>
          )}
          {!hasInsurance && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Missing
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasInsurance ? (
          <p className="text-sm text-muted-foreground py-2">
            Borrower has not provided insurance information. Request via the
            borrower portal or the conditions checklist.
          </p>
        ) : (
          <div className="grid gap-2 text-sm sm:grid-cols-2">
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
            />
            {insurance.insurance_agent_name && (
              <Row label="Agent" value={insurance.insurance_agent_name} />
            )}
            {insurance.insurance_agent_phone && (
              <Row label="Agent Phone" value={insurance.insurance_agent_phone} />
            )}
            {insurance.insurance_agent_email && (
              <Row label="Agent Email" value={insurance.insurance_agent_email} />
            )}
            {insurance.insurance_updated_at && (
              <Row
                label="Last Updated"
                value={formatDate(insurance.insurance_updated_at)}
              />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value || "--"}</span>
    </div>
  );
}
