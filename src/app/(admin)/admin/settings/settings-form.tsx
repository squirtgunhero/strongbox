"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveSettings } from "./actions";

interface Settings {
  org_name: string;
  licensed_states: string[];
  dual_approval_threshold: number;
  max_ltarv: number;
  max_ltv: number;
  max_ltc: number;
  max_borrower_concentration: number;
  max_state_concentration: number;
  require_mfa_for_staff?: boolean;
}

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await saveSettings(formData);
        setStatus("Saved");
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Failed");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="org_name">Organization Name</Label>
        <Input
          id="org_name"
          name="org_name"
          defaultValue={settings?.org_name || ""}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="licensed_states">
          Licensed States <span className="text-muted-foreground text-xs">(comma-separated 2-letter codes)</span>
        </Label>
        <Input
          id="licensed_states"
          name="licensed_states"
          defaultValue={(settings?.licensed_states || []).join(", ")}
          placeholder="NJ, NY, PA, FL"
        />
        <p className="text-xs text-muted-foreground">
          Loans cannot be originated in states not on this list. Leave empty to
          allow all states.
        </p>
      </div>

      <div className="pt-2">
        <div className="text-[13px] font-semibold">Underwriting Limits</div>
        <p className="text-[12px] text-muted-foreground mt-0.5">Maximum ratios applied during loan underwriting. Loans exceeding these thresholds are flagged for review.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="dual_approval_threshold">
            Dual Approval Threshold ($)
          </Label>
          <Input
            id="dual_approval_threshold"
            name="dual_approval_threshold"
            type="number"
            step="0.01"
            defaultValue={settings?.dual_approval_threshold || 10000}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="max_ltarv">Max LTARV (%)</Label>
          <Input
            id="max_ltarv"
            name="max_ltarv"
            type="number"
            step="0.01"
            defaultValue={(Number(settings?.max_ltarv) || 0.75) * 100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_ltv">Max LTV (%)</Label>
          <Input
            id="max_ltv"
            name="max_ltv"
            type="number"
            step="0.01"
            defaultValue={(Number(settings?.max_ltv) || 0.7) * 100}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_ltc">Max LTC (%)</Label>
          <Input
            id="max_ltc"
            name="max_ltc"
            type="number"
            step="0.01"
            defaultValue={(Number(settings?.max_ltc) || 0.85) * 100}
          />
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground -mt-2">LTARV = Loan-to-After-Repair Value · LTV = Loan-to-Value (as-is) · LTC = Loan-to-Cost</p>

      <div className="pt-2">
        <div className="text-[13px] font-semibold">Concentration Limits</div>
        <p className="text-[12px] text-muted-foreground mt-0.5">Dashboard alerts when portfolio exposure to a single borrower or state exceeds these percentages.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="max_borrower_concentration">
            Max Single-Borrower Concentration (%)
          </Label>
          <Input
            id="max_borrower_concentration"
            name="max_borrower_concentration"
            type="number"
            step="0.01"
            defaultValue={
              (Number(settings?.max_borrower_concentration) || 0.20) * 100
            }
          />
          <p className="text-xs text-muted-foreground">
            Dashboard warns when one borrower exceeds this share of deployed
            capital.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="max_state_concentration">
            Max Single-State Concentration (%)
          </Label>
          <Input
            id="max_state_concentration"
            name="max_state_concentration"
            type="number"
            step="0.01"
            defaultValue={
              (Number(settings?.max_state_concentration) || 0.40) * 100
            }
          />
        </div>
      </div>

      <div className="pt-2">
        <div className="text-[13px] font-semibold">Security</div>
        <p className="text-[12px] text-muted-foreground mt-0.5">Authentication and access control settings for staff accounts.</p>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            name="require_mfa_for_staff"
            defaultChecked={settings?.require_mfa_for_staff || false}
            className="mt-0.5 h-4 w-4 accent-foreground"
          />
          <div className="flex-1">
            <div className="text-[13px] font-medium">
              Require MFA for all staff sessions
            </div>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Admins and loan officers without an AAL2 session are redirected
              to enroll a TOTP factor before they can access /admin/* or
              perform any privileged action. Make sure at least one admin has
              enrolled MFA before enabling — otherwise you&apos;ll lock
              everyone out. Each user manages their factor at
              <code className="ml-1 rounded bg-background px-1.5 py-0.5 text-[11px]">
                /admin/security/mfa
              </code>
              .
            </p>
          </div>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save Settings"}
        </Button>
        {status && (
          <span
            className={
              status === "Saved"
                ? "text-sm text-green-600"
                : "text-sm text-destructive"
            }
          >
            {status}
          </span>
        )}
      </div>
    </form>
  );
}
