"use client";

import { useState, useActionState } from "react";
import { createInvestor } from "../actions";
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

export function InvestorForm() {
  const [investorType, setInvestorType] = useState("individual");
  const [error, action, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await createInvestor(formData);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "An error occurred";
      }
    },
    null
  );

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label>Investor Type</Label>
        <Select
          name="investor_type"
          defaultValue="individual"
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

      {investorType === "individual" ? (
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input id="full_name" name="full_name" required />
        </div>
      ) : (
        <div className="space-y-2">
          <Label htmlFor="entity_name">Entity Name</Label>
          <Input id="entity_name" name="entity_name" required />
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="committed_capital">Committed Capital</Label>
        <Input
          id="committed_capital"
          name="committed_capital"
          type="number"
          step="0.01"
          min="0"
          defaultValue="0"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={2} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create Investor"}
      </Button>
    </form>
  );
}
