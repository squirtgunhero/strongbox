"use client";

import { useActionState } from "react";
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
}

export function SettingsForm({ settings }: { settings: Settings | null }) {
  const [status, action, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await saveSettings(formData);
        return "Saved";
      } catch (e) {
        return e instanceof Error ? e.message : "Failed";
      }
    },
    null
  );

  return (
    <form action={action} className="space-y-4">
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
