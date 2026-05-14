"use client";

import { useState, useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateInvestor } from "./investor-edit-actions";
import { revealInvestorTaxId } from "./reveal-actions";
import { SensitiveField } from "../../borrowers/[id]/borrower-edit-form";

interface Investor {
  id: string;
  investor_type: string;
  full_name: string | null;
  entity_name: string | null;
  email: string | null;
  phone: string | null;
  committed_capital: number;
  notes: string | null;
}

export function InvestorEditForm({
  investor,
  tax_id_last_four,
}: {
  investor: Investor;
  tax_id_last_four: string | null;
}) {
  const [investorType, setInvestorType] = useState(investor.investor_type);
  const [status, action, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await updateInvestor(investor.id, formData);
        return "Saved";
      } catch (e) {
        return e instanceof Error ? e.message : "Failed";
      }
    },
    null
  );

  const isIndividual = investorType === "individual";

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label>Investor Type</Label>
        <Select
          name="investor_type"
          value={investorType}
          onValueChange={(v) => v && setInvestorType(v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="individual">Individual</SelectItem>
            <SelectItem value="entity">Entity</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {isIndividual ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              name="full_name"
              defaultValue={investor.full_name || ""}
              required
            />
          </div>
        ) : (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="entity_name">Entity Name</Label>
            <Input
              id="entity_name"
              name="entity_name"
              defaultValue={investor.entity_name || ""}
              required
            />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={investor.email || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={investor.phone || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="committed_capital">Committed Capital</Label>
          <Input
            id="committed_capital"
            name="committed_capital"
            type="number"
            step="0.01"
            min="0"
            defaultValue={investor.committed_capital}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <SensitiveField
            label={isIndividual ? "SSN (Tax ID)" : "EIN (Tax ID)"}
            inputName="tax_id"
            lastFour={tax_id_last_four}
            mask={(l4) =>
              isIndividual ? `•••-••-${l4}` : `••-•••${l4}`
            }
            placeholderFormat={isIndividual ? "XXX-XX-XXXX" : "XX-XXXXXXX"}
            onReveal={() => revealInvestorTaxId(investor.id)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={investor.notes || ""}
        />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
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
