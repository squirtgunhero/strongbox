"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { setLoanTags } from "./tag-actions";

export function TagsEditor({
  loanId,
  initialTags,
}: {
  loanId: string;
  initialTags: string[];
}) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);

  async function save(next: string[]) {
    setPending(true);
    try {
      await setLoanTags(loanId, next);
      setTags(next);
    } finally {
      setPending(false);
    }
  }

  function handleAdd(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter" && e.key !== ",") return;
    e.preventDefault();
    const v = input.trim().replace(/,$/, "");
    if (!v) return;
    if (tags.includes(v)) {
      setInput("");
      return;
    }
    const next = [...tags, v];
    setInput("");
    save(next);
  }

  function handleRemove(tag: string) {
    save(tags.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-wrap gap-1.5 items-center">
      {tags.map((t) => (
        <Badge key={t} variant="secondary" className="text-xs gap-1 pr-1">
          {t}
          <button
            onClick={() => handleRemove(t)}
            disabled={pending}
            className="hover:bg-muted/60 rounded-full p-0.5"
            aria-label={`Remove ${t}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </Badge>
      ))}
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleAdd}
        placeholder="Add tag..."
        className="h-6 w-28 text-xs"
        disabled={pending}
      />
    </div>
  );
}
