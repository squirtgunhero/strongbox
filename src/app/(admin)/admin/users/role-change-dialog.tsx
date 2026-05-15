"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { changeUserRole } from "./actions";
import type { UserRole } from "@/lib/types";

const STAFF_LABEL: Record<"admin" | "loan_officer", string> = {
  admin: "Admin",
  loan_officer: "Loan officer",
};

export function RoleChangeDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentRole,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentRole: "admin" | "loan_officer";
}) {
  const [newRole, setNewRole] = useState<"admin" | "loan_officer">(
    currentRole === "admin" ? "loan_officer" : "admin"
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setPending(true);
    setError("");
    try {
      await changeUserRole(userId, newRole as UserRole);
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change role");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change role for {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Current role:{" "}
            <span className="font-medium text-foreground">
              {STAFF_LABEL[currentRole]}
            </span>
          </div>
          <div className="space-y-2">
            <Label>New role</Label>
            <Select
              value={newRole}
              onValueChange={(v) =>
                v && setNewRole(v as "admin" | "loan_officer")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="loan_officer">Loan officer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {error && (
            <div className="text-xs text-destructive">{error}</div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={pending || newRole === currentRole}>
            {pending ? "Saving..." : "Change role"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
