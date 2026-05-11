"use client";

import { Button } from "@/components/ui/button";
import { Printer, ChevronLeft } from "lucide-react";
import Link from "next/link";

export function PrintBar({ backHref }: { backHref: string }) {
  return (
    <div className="doc-print-bar">
      <Link
        href={backHref}
        className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back
      </Link>
      <Button size="sm" onClick={() => window.print()}>
        <Printer className="mr-2 h-3 w-3" />
        Print / Save as PDF
      </Button>
    </div>
  );
}
