"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addLoanNote } from "./notes-actions";
import { formatDate } from "@/lib/format";

interface Note {
  id: string;
  body: string;
  created_at: string;
  author?: { full_name: string } | null;
}

export function NotesThread({
  loanId,
  notes,
}: {
  loanId: string;
  notes: Note[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(formData: FormData) {
    setSubmitting(true);
    setError("");
    try {
      await addLoanNote(loanId, formData);
      const form = document.getElementById("note-form") as HTMLFormElement | null;
      form?.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form id="note-form" action={handleSubmit} className="space-y-2">
          <Textarea
            name="body"
            placeholder="Add a note..."
            rows={2}
            required
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" size="sm" disabled={submitting}>
            {submitting ? "Adding..." : "Add Note"}
          </Button>
        </form>

        <div className="space-y-3 pt-2">
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No notes yet.
            </p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="border-l-2 pl-3 space-y-1">
                <div className="flex items-baseline justify-between text-xs">
                  <span className="font-medium">
                    {note.author?.full_name || "Unknown"}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDate(note.created_at)}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{note.body}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
