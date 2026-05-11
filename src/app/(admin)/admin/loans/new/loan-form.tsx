"use client";

import { useActionState, useState } from "react";
import { createLoan } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export function LoanForm() {
  const [borrowerType, setBorrowerType] = useState("individual");
  const [error, action, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await createLoan(formData);
        return null;
      } catch (e) {
        return e instanceof Error ? e.message : "An error occurred";
      }
    },
    null
  );

  return (
    <form action={action} className="space-y-8">
      {/* Property */}
      <div className="space-y-4">
        <h3 className="font-semibold">Property</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-2">
            <Label htmlFor="address_street">Street Address</Label>
            <Input id="address_street" name="address_street" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address_city">City</Label>
            <Input id="address_city" name="address_city" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_state">State</Label>
              <Input id="address_state" name="address_state" maxLength={2} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address_zip">ZIP</Label>
              <Input id="address_zip" name="address_zip" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Property Type</Label>
            <Select name="property_type" defaultValue="single_family">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single_family">Single Family</SelectItem>
                <SelectItem value="multi_family">Multi-Family</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="land">Land</SelectItem>
                <SelectItem value="mixed_use">Mixed Use</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchase_price">Purchase Price</Label>
            <Input id="purchase_price" name="purchase_price" type="number" step="0.01" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="as_is_value">As-Is Value</Label>
            <Input id="as_is_value" name="as_is_value" type="number" step="0.01" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="after_repair_value">After-Repair Value (ARV)</Label>
            <Input id="after_repair_value" name="after_repair_value" type="number" step="0.01" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rehab_budget">Rehab Budget</Label>
            <Input id="rehab_budget" name="rehab_budget" type="number" step="0.01" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Borrower */}
      <div className="space-y-4">
        <h3 className="font-semibold">Borrower</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Borrower Type</Label>
            <Select
              name="borrower_type"
              defaultValue="individual"
              onValueChange={(v) => v && setBorrowerType(v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="entity">Entity (LLC, etc.)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {borrowerType === "individual" ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input id="first_name" name="first_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input id="last_name" name="last_name" required />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="entity_name">Entity Name</Label>
                <Input id="entity_name" name="entity_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="formation_state">Formation State</Label>
                <Input id="formation_state" name="formation_state" maxLength={2} />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="borrower_email">Email</Label>
            <Input id="borrower_email" name="borrower_email" type="email" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="borrower_phone">Phone</Label>
            <Input id="borrower_phone" name="borrower_phone" type="tel" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="deals_completed">Deals Completed</Label>
            <Input
              id="deals_completed"
              name="deals_completed"
              type="number"
              defaultValue="0"
              min="0"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Loan Terms */}
      <div className="space-y-4">
        <h3 className="font-semibold">Loan Terms</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="loan_amount">Loan Amount</Label>
            <Input
              id="loan_amount"
              name="loan_amount"
              type="number"
              step="0.01"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="interest_rate">Interest Rate (%)</Label>
            <Input
              id="interest_rate"
              name="interest_rate"
              type="number"
              step="0.01"
              placeholder="12.00"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="points">Points (%)</Label>
            <Input
              id="points"
              name="points"
              type="number"
              step="0.01"
              placeholder="2.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="term_months">Term (months)</Label>
            <Input
              id="term_months"
              name="term_months"
              type="number"
              min="1"
              placeholder="12"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Day Count Convention</Label>
            <Select name="day_count" defaultValue="actual_360">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="actual_360">Actual/360</SelectItem>
                <SelectItem value="actual_365">Actual/365</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Purpose</Label>
            <Select name="loan_purpose" defaultValue="purchase">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="refinance">Refinance</SelectItem>
                <SelectItem value="rehab">Rehab</SelectItem>
                <SelectItem value="ground_up">Ground-Up Construction</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Exit Strategy</Label>
            <Select name="exit_strategy" defaultValue="sale">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sale">Sale</SelectItem>
                <SelectItem value="refinance">Refinance</SelectItem>
                <SelectItem value="rental">Rental</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Initial Status</Label>
            <Select name="status" defaultValue="lead">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="application">Application</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create Loan"}
        </Button>
      </div>
    </form>
  );
}
