"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

export function ListSearch({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
      <Input
        defaultValue={params.get("q") || ""}
        placeholder={placeholder}
        className="pl-9"
        onChange={(e) => {
          const p = new URLSearchParams(params.toString());
          if (e.target.value) p.set("q", e.target.value);
          else p.delete("q");
          startTransition(() => {
            router.push(`${pathname}${p.toString() ? `?${p}` : ""}`);
          });
        }}
      />
    </div>
  );
}
