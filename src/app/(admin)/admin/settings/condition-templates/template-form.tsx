"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTemplate } from "./actions";

export function TemplateForm() {
  const [status, action, pending] = useActionState(
    async (_prev: string | null, formData: FormData) => {
      try {
        await createTemplate(formData);
        return "Created";
      } catch (e) {
        return e instanceof Error ? e.message : "Failed";
      }
    },
    null
  );

  return (
    <form action={action} className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="name">Template Name</Label>
        <Input id="name" name="name" placeholder="e.g. Bridge Loan" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="conditions">Conditions (one per line)</Label>
        <Textarea
          id="conditions"
          name="conditions"
          rows={6}
          placeholder={"Clear title commitment\nHazard insurance\nPersonal guarantee"}
          required
        />
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create Template"}
        </Button>
        {status && (
          <span
            className={
              status === "Created"
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
