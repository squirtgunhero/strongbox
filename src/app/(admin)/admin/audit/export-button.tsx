"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function AuditExportButton() {
  const params = useSearchParams();
  const passthrough = new URLSearchParams();
  for (const key of ["action", "table", "from", "to"]) {
    const v = params.get(key);
    if (v) passthrough.set(key, v);
  }
  const href = `/api/reports/audit.csv${passthrough.toString() ? `?${passthrough}` : ""}`;
  return (
    <Button
      nativeButton={false}
      variant="outline"
      size="sm"
      render={<Link href={href} target="_blank" />}
    >
      <Download className="mr-2 h-3 w-3" />
      Export CSV
    </Button>
  );
}
