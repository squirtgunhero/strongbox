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
import { updateBorrower } from "./borrower-actions";

interface Borrower {
  id: string;
  borrower_type: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  credit_score: number | null;
  entity_name: string | null;
  formation_state: string | null;
  deals_completed: number;
  notes: string | null;
}

export function BorrowerEditForm({ borrower }: { borrower: Borrower }) {
  const [borrowerType, setBorrowerType] = useState(borrower.borrower_type);
  const [status, action, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await updateBorrower(borrower.id, formData);
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
        <Label>Borrower Type</Label>
        <Select
          name="borrower_type"
          value={borrowerType}
          onValueChange={(v) => v && setBorrowerType(v)}
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
        {borrowerType === "individual" ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                name="first_name"
                defaultValue={borrower.first_name || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                name="last_name"
                defaultValue={borrower.last_name || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="credit_score">Credit Score</Label>
              <Input
                id="credit_score"
                name="credit_score"
                type="number"
                min="300"
                max="850"
                defaultValue={borrower.credit_score || ""}
              />
            </div>
          </>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="entity_name">Entity Name</Label>
              <Input
                id="entity_name"
                name="entity_name"
                defaultValue={borrower.entity_name || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="formation_state">Formation State</Label>
              <Input
                id="formation_state"
                name="formation_state"
                maxLength={2}
                defaultValue={borrower.formation_state || ""}
              />
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={borrower.email || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={borrower.phone || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deals_completed">Prior Deals Completed</Label>
          <Input
            id="deals_completed"
            name="deals_completed"
            type="number"
            min="0"
            defaultValue={borrower.deals_completed}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={borrower.notes || ""}
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
