"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { getDocumentSignedUrl } from "@/app/(admin)/admin/loans/[id]/documents-actions";

export function DownloadButton({ storagePath }: { storagePath: string }) {
  async function handleClick() {
    try {
      const url = await getDocumentSignedUrl(storagePath);
      window.open(url, "_blank");
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Button size="xs" variant="ghost" onClick={handleClick}>
      <Download className="h-3 w-3" />
    </Button>
  );
}
