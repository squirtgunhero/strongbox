import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Receipt, Mail, ScrollText } from "lucide-react";

export function DocumentActionsBar({ loanId }: { loanId: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        nativeButton={false}
        variant="outline"
        size="sm"
        render={<Link href={`/documents/${loanId}/term-sheet`} target="_blank" />}
      >
        <FileText className="mr-2 h-3 w-3" />
        Term Sheet
      </Button>
      <Button
        nativeButton={false}
        variant="outline"
        size="sm"
        render={<Link href={`/documents/${loanId}/payoff-letter`} target="_blank" />}
      >
        <Receipt className="mr-2 h-3 w-3" />
        Payoff Letter
      </Button>
      <Button
        nativeButton={false}
        variant="outline"
        size="sm"
        render={<Link href={`/documents/${loanId}/statement`} target="_blank" />}
      >
        <Mail className="mr-2 h-3 w-3" />
        Monthly Statement
      </Button>
      <Button
        nativeButton={false}
        variant="outline"
        size="sm"
        render={
          <Link
            href={`/documents/${loanId}/business-purpose-affidavit`}
            target="_blank"
          />
        }
      >
        <ScrollText className="mr-2 h-3 w-3" />
        Business-Purpose Affidavit
      </Button>
    </div>
  );
}
