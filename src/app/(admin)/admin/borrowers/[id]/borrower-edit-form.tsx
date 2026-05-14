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
import { revealBorrowerSSN, revealBorrowerEIN } from "./reveal-actions";

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

export function BorrowerEditForm({
  borrower,
  ssn_last_four,
  ein_last_four,
}: {
  borrower: Borrower;
  ssn_last_four: string | null;
  ein_last_four: string | null;
}) {
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
            <div className="space-y-2 sm:col-span-2">
              <SensitiveField
                label="SSN"
                inputName="ssn"
                lastFour={ssn_last_four}
                mask={(l4) => `•••-••-${l4}`}
                placeholderFormat="XXX-XX-XXXX"
                onReveal={() => revealBorrowerSSN(borrower.id)}
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
            <div className="space-y-2 sm:col-span-2">
              <SensitiveField
                label="EIN"
                inputName="ein"
                lastFour={ein_last_four}
                mask={(l4) => `••-•••${l4}`}
                placeholderFormat="XX-XXXXXXX"
                onReveal={() => revealBorrowerEIN(borrower.id)}
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

/**
 * Masked-by-default sensitive field. Empty submission preserves existing value.
 * "Reveal" calls a server action that audit-logs the access and returns plaintext.
 */
export function SensitiveField({
  label,
  inputName,
  lastFour,
  mask,
  placeholderFormat,
  onReveal,
}: {
  label: string;
  inputName: string;
  lastFour: string | null;
  mask: (lastFour: string) => string;
  placeholderFormat: string;
  onReveal: () => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasExisting = !!lastFour;

  async function handleReveal() {
    setError(null);
    setRevealing(true);
    try {
      const plaintext = await onReveal();
      if (plaintext) {
        setValue(plaintext);
        setEditing(true);
      } else {
        setError("No value on file");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reveal");
    } finally {
      setRevealing(false);
    }
  }

  function handleHide() {
    setEditing(false);
    setValue("");
    setError(null);
  }

  return (
    <>
      <Label htmlFor={inputName}>{label}</Label>
      {editing || !hasExisting ? (
        <div className="flex items-center gap-2">
          <Input
            id={inputName}
            name={inputName}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholderFormat}
            autoComplete="off"
          />
          {hasExisting && (
            <Button type="button" variant="outline" size="sm" onClick={handleHide}>
              Hide
            </Button>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Input
            value={mask(lastFour!)}
            readOnly
            className="font-mono"
            aria-label={`${label} (masked)`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReveal}
            disabled={revealing}
          >
            {revealing ? "..." : "Reveal"}
          </Button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        {hasExisting
          ? "Leave blank to keep current value. Reveal logs an access entry."
          : `Enter ${label}. Stored encrypted at rest.`}
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </>
  );
}
