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
import { Upload, Download, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import {
  uploadPropertyDocument,
  deletePropertyDocument,
} from "./document-actions";
import { getDocumentSignedUrl } from "@/app/(admin)/admin/loans/[id]/documents-actions";

const CATEGORY_LABELS: Record<string, string> = {
  photo: "Photo",
  comp: "Comp",
  survey: "Survey",
  appraisal: "Appraisal",
  bpo: "BPO",
  deed: "Deed",
  plat_map: "Plat Map",
  environmental: "Environmental",
  other: "Other",
};

interface Doc {
  id: string;
  category: string;
  filename: string;
  storage_path: string;
  created_at: string;
}

export function PropertyDocuments({
  propertyId,
  documents,
}: {
  propertyId: string;
  documents: Doc[];
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(formData: FormData) {
    setUploading(true);
    setError("");
    try {
      await uploadPropertyDocument(propertyId, formData);
      const form = document.getElementById(
        "prop-doc-form"
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

  async function handleDelete(docId: string) {
    if (!confirm("Delete this document?")) return;
    await deletePropertyDocument(docId, propertyId);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Property Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          id="prop-doc-form"
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
            No property-level documents yet. Loan-specific documents live on
            each loan&apos;s page.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((d) => (
                <TableRow key={d.id}>
                  <TableCell className="font-medium">{d.filename}</TableCell>
                  <TableCell>
                    {CATEGORY_LABELS[d.category] || d.category}
                  </TableCell>
                  <TableCell>{formatDate(d.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleDownload(d.storage_path)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => handleDelete(d.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
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
