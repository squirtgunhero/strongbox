"use client";

import { useActionState } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { importBorrowersCsv, type BorrowerImportResult } from "./import-actions";

const INITIAL_STATE: BorrowerImportResult = {
  ok: false,
  message: "",
  processed: 0,
  imported: 0,
  failed: 0,
  errors: [],
};

export function BorrowerImportPanel() {
  const [state, action, pending] = useActionState(importBorrowersCsv, INITIAL_STATE);

  return (
    <section className="rounded-md border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-semibold">Import Borrowers (CSV)</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Required columns: borrower_type. For individual rows include first_name and
            last_name. For entity rows include entity_name.
          </p>
        </div>
        <Button
          nativeButton={false}
          size="sm"
          variant="outline"
          render={<a href="/api/templates/borrowers-import.csv" target="_blank" />}
        >
          <Download className="mr-2 h-3.5 w-3.5" />
          Template
        </Button>
      </div>

      <form action={action} className="flex gap-2 flex-wrap items-center">
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="text-xs file:mr-3 file:rounded-md file:border file:bg-background file:px-2.5 file:py-1 file:text-xs"
        />
        <Button type="submit" size="sm" disabled={pending}>
          <Upload className="mr-2 h-3.5 w-3.5" />
          {pending ? "Importing..." : "Import CSV"}
        </Button>
      </form>

      {state.message ? (
        <div className={state.ok ? "text-xs text-green-700" : "text-xs text-destructive"}>
          <p>{state.message}</p>
          {state.processed > 0 ? (
            <p className="mt-1 text-muted-foreground">
              Processed {state.processed} rows. Imported {state.imported}. Failed{" "}
              {state.failed}.
            </p>
          ) : null}
          {state.errors.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {state.errors.slice(0, 8).map((err) => (
                <li key={err}>- {err}</li>
              ))}
              {state.errors.length > 8 ? <li>- ...and more</li> : null}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
