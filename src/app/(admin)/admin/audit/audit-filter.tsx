"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ACTIONS = [
  { value: "all", label: "All actions" },
  { value: "insert", label: "Insert" },
  { value: "update", label: "Update" },
  { value: "status_change", label: "Status change" },
  { value: "access", label: "Access" },
  { value: "disbursement", label: "Disbursement" },
];

const TABLES = [
  { value: "all", label: "All tables" },
  { value: "loans", label: "Loans" },
  { value: "payments", label: "Payments" },
  { value: "draws", label: "Draws" },
  { value: "loan_documents", label: "Documents" },
  { value: "signature_requests", label: "Signature requests" },
  { value: "investor_positions", label: "Investor positions" },
  { value: "investors", label: "Investors" },
  { value: "borrowers", label: "Borrowers" },
  { value: "properties", label: "Properties" },
  { value: "org_settings", label: "Settings" },
  { value: "notifications", label: "Notifications" },
];

export function AuditFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const currentAction = params.get("action") || "all";
  const currentTable = params.get("table") || "all";
  const from = params.get("from") || "";
  const to = params.get("to") || "";

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "all") p.set(k, v);
      else p.delete(k);
    }
    // Reset to page 1 when filters change
    p.delete("page");
    startTransition(() => {
      router.push(`/admin/audit${p.toString() ? `?${p}` : ""}`);
    });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-4 items-end">
      <div className="space-y-1">
        <Label className="text-xs">Action</Label>
        <Select
          value={currentAction}
          onValueChange={(v) => v && update({ action: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIONS.map((a) => (
              <SelectItem key={a.value} value={a.value}>
                {a.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Table</Label>
        <Select
          value={currentTable}
          onValueChange={(v) => v && update({ table: v })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TABLES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">From</Label>
        <Input
          type="date"
          defaultValue={from}
          onChange={(e) => update({ from: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">To</Label>
        <Input
          type="date"
          defaultValue={to}
          onChange={(e) => update({ to: e.target.value })}
        />
      </div>
    </div>
  );
}
