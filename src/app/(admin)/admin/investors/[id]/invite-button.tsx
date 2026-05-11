"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mail, Check } from "lucide-react";
import { inviteInvestor } from "@/app/(admin)/admin/borrowers/[id]/invite-actions";
import { toast } from "sonner";

export function InvestorInviteButton({
  investorId,
  alreadyLinked,
}: {
  investorId: string;
  alreadyLinked: boolean;
}) {
  const [pending, setPending] = useState(false);

  if (alreadyLinked) {
    return (
      <span className="text-xs text-green-700 inline-flex items-center gap-1">
        <Check className="h-3 w-3" />
        Portal account linked
      </span>
    );
  }

  async function handleClick() {
    setPending(true);
    try {
      const result = await inviteInvestor(investorId);
      toast.success(`Invite sent to ${result.email}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={pending}>
      <Mail className="mr-2 h-3 w-3" />
      {pending ? "Sending..." : "Invite to Portal"}
    </Button>
  );
}
