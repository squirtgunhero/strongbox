"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

export function ExportButton() {
  const params = useSearchParams();
  // Pass-through filters; CSV route reads status/officer/mine
  const passthrough = new URLSearchParams();
  for (const key of ["status", "officer", "mine"]) {
    const v = params.get(key);
    if (v) passthrough.set(key, v);
  }
  const href = `/api/reports/loans.csv${passthrough.toString() ? `?${passthrough}` : ""}`;
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
