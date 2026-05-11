"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { flushPending } from "./actions";
import { toast } from "sonner";

export function FlushButton({ pendingCount }: { pendingCount: number }) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    try {
      const result = await flushPending();
      if (result.sent === 0 && result.failed === 0) {
        toast.info("Nothing to send");
      } else {
        toast.success(`Sent ${result.sent}, ${result.failed} failed`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  if (pendingCount === 0) return null;

  return (
    <Button
      size="sm"
      variant="default"
      onClick={handleClick}
      disabled={loading}
    >
      <Send className="mr-2 h-3 w-3" />
      {loading
        ? "Sending..."
        : `Send ${pendingCount} pending`}
    </Button>
  );
}
