"use client";

import { useActionState } from "react";
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
import { updateProperty } from "./actions";

interface Property {
  id: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  property_type: string;
  purchase_price: number | null;
  as_is_value: number | null;
  after_repair_value: number | null;
  rehab_budget: number | null;
  square_footage: number | null;
  parcel_number: string | null;
  county: string | null;
}

export function PropertyEditForm({ property }: { property: Property }) {
  const [status, action, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await updateProperty(property.id, formData);
        return "Saved";
      } catch (e) {
        return e instanceof Error ? e.message : "Failed";
      }
    },
    null
  );

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 space-y-2">
          <Label htmlFor="address_street">Street</Label>
          <Input
            id="address_street"
            name="address_street"
            defaultValue={property.address_street}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="address_city">City</Label>
          <Input
            id="address_city"
            name="address_city"
            defaultValue={property.address_city}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="address_state">State</Label>
            <Input
              id="address_state"
              name="address_state"
              defaultValue={property.address_state}
              maxLength={2}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address_zip">ZIP</Label>
            <Input
              id="address_zip"
              name="address_zip"
              defaultValue={property.address_zip}
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Property Type</Label>
          <Select
            name="property_type"
            defaultValue={property.property_type}
          >
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
          <Label htmlFor="county">County</Label>
          <Input
            id="county"
            name="county"
            defaultValue={property.county || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parcel_number">Parcel Number</Label>
          <Input
            id="parcel_number"
            name="parcel_number"
            defaultValue={property.parcel_number || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="square_footage">Square Footage</Label>
          <Input
            id="square_footage"
            name="square_footage"
            type="number"
            defaultValue={property.square_footage || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchase_price">Purchase Price</Label>
          <Input
            id="purchase_price"
            name="purchase_price"
            type="number"
            step="0.01"
            defaultValue={property.purchase_price || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="as_is_value">As-Is Value</Label>
          <Input
            id="as_is_value"
            name="as_is_value"
            type="number"
            step="0.01"
            defaultValue={property.as_is_value || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="after_repair_value">After-Repair Value</Label>
          <Input
            id="after_repair_value"
            name="after_repair_value"
            type="number"
            step="0.01"
            defaultValue={property.after_repair_value || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rehab_budget">Rehab Budget</Label>
          <Input
            id="rehab_budget"
            name="rehab_budget"
            type="number"
            step="0.01"
            defaultValue={property.rehab_budget || ""}
          />
        </div>
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
