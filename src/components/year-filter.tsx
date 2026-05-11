"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function YearFilter({ years }: { years: number[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const current = params.get("year") || "all";

  function update(value: string) {
    const p = new URLSearchParams(params.toString());
    if (value && value !== "all") p.set("year", value);
    else p.delete("year");
    startTransition(() => {
      router.push(`${pathname}${p.toString() ? `?${p}` : ""}`);
    });
  }

  return (
    <Select value={current} onValueChange={(v) => v && update(v)}>
      <SelectTrigger className="w-[140px] h-8 text-xs">
        <SelectValue placeholder="All years" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All years</SelectItem>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
