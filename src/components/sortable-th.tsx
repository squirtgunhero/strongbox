"use client";

import Link from "next/link";
import { useSearchParams, usePathname } from "next/navigation";
import { TableHead } from "@/components/ui/table";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function SortableTH({
  field,
  children,
  align = "left",
  className,
}: {
  field: string;
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const currentSort = params.get("sort");
  const currentDir = params.get("dir") || "desc";

  const isActive = currentSort === field;
  const nextDir = isActive && currentDir === "desc" ? "asc" : "desc";

  const next = new URLSearchParams(params.toString());
  next.set("sort", field);
  next.set("dir", nextDir);

  const Icon = !isActive
    ? ChevronsUpDown
    : currentDir === "desc"
      ? ChevronDown
      : ChevronUp;

  return (
    <TableHead className={cn(align === "right" && "text-right", className)}>
      <Link
        href={`${pathname}?${next.toString()}`}
        className={`inline-flex items-center gap-1 hover:text-foreground ${
          isActive ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {children}
        <Icon className="h-3 w-3" />
      </Link>
    </TableHead>
  );
}
