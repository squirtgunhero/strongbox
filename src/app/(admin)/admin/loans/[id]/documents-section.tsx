"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { uploadDocument, getDocumentSignedUrl } from "./documents-actions";
import { formatDate } from "@/lib/format";
import { Download, Upload } from "lucide-react";

const CATEGORY_LABELS: Record<string, string> = {
  application: "Application",
  term_sheet: "Term Sheet",
  promissory_note: "Promissory Note",
  deed_of_trust: "Deed of Trust",
  personal_guarantee: "Personal Guarantee",
  title_commitment: "Title Commitment",
  hazard_insurance: "Hazard Insurance",
  appraisal: "Appraisal",
  bpo: "BPO",
  rehab_budget: "Rehab Budget",
  payoff_letter: "Payoff Letter",
  entity_docs: "Entity Docs",
  bank_statement: "Bank Statement",
  tax_return: "Tax Return",
  other: "Other",
};

interface Document {
  id: string;
  category: string;
  filename: string;
  storage_path: string;
  size_bytes: number | null;
  created_at: string;
  uploaded_by_user?: { full_name: string } | null;
}

export function DocumentsSection({
  loanId,
  documents,
}: {
  loanId: string;
  documents: Document[];
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(formData: FormData) {
    setUploading(true);
    setError("");
    try {
      await uploadDocument(loanId, formData);
      const form = document.getElementById(
        "doc-form"
      ) as HTMLFormElement | null;
      form?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(storagePath: string) {
    try {
      const url = await getDocumentSignedUrl(storagePath);
      window.open(url, "_blank");
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          id="doc-form"
          action={handleUpload}
          className="grid gap-3 sm:grid-cols-[1fr_200px_auto] items-end"
        >
          <div className="space-y-2">
            <Label htmlFor="file">File</Label>
            <Input id="file" name="file" type="file" required />
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select name="category" defaultValue="other">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={uploading}>
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No documents uploaded yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>By</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.filename}</TableCell>
                  <TableCell>{CATEGORY_LABELS[d.category] || d.category}</TableCell>
                  <TableCell>{formatDate(d.created_at)}</TableCell>
                  <TableCell>{d.uploaded_by_user?.full_name || "--"}</TableCell>
                  <TableCell>
                    <Button
                      size="xs"
                      variant="ghost"
                      onClick={() => handleDownload(d.storage_path)}
                    >
                      <Download className="h-3 w-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
