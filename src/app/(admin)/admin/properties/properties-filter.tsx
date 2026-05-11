"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

export function PropertiesFilter({ states }: { states: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const currentSearch = params.get("q") || "";
  const currentState = params.get("state") || "all";

  function update(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v && v !== "all") p.set(k, v);
      else p.delete(k);
    }
    startTransition(() => {
      router.push(`/admin/properties${p.toString() ? `?${p}` : ""}`);
    });
  }

  return (
    <div className="flex gap-3 items-end flex-wrap">
      <div className="flex-1 min-w-[240px] max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            defaultValue={currentSearch}
            placeholder="Search by address..."
            className="pl-9"
            onChange={(e) => update({ q: e.target.value })}
          />
        </div>
      </div>
      <div className="w-[160px]">
        <Select
          value={currentState}
          onValueChange={(v) => v && update({ state: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Any state" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any state</SelectItem>
            {states.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
