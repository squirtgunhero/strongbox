"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateBorrowerProfile } from "./actions";

interface Profile {
  full_name: string;
  email: string;
  phone: string | null;
}
interface Borrower {
  borrower_type: string;
  first_name: string | null;
  last_name: string | null;
  entity_name: string | null;
  email: string | null;
  phone: string | null;
}

export function ProfileForm({
  profile,
  borrower,
}: {
  profile: Profile | null;
  borrower: Borrower | null;
}) {
  const [status, action, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await updateBorrowerProfile(formData);
        return "Saved";
      } catch (e) {
        return e instanceof Error ? e.message : "Failed";
      }
    },
    null
  );

  const isEntity = borrower?.borrower_type === "entity";

  return (
    <form action={action} className="space-y-4">
      <input
        type="hidden"
        name="borrower_type"
        value={borrower?.borrower_type || "individual"}
      />

      <div className="space-y-2">
        <Label htmlFor="full_name">Display Name</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={profile?.full_name || ""}
          required
        />
        <p className="text-xs text-muted-foreground">
          How your name appears in the portal.
        </p>
      </div>

      {borrower && (
        <>
          {isEntity ? (
            <div className="space-y-2">
              <Label htmlFor="entity_name">Entity Name</Label>
              <Input
                id="entity_name"
                name="entity_name"
                defaultValue={borrower.entity_name || ""}
                required
              />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
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
            </div>
          )}
        </>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={borrower?.email || profile?.email || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={borrower?.phone || profile?.phone || ""}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
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
