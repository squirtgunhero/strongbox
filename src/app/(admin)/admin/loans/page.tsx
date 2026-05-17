import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { LoansFilter } from "./loans-filter";
import { LoansTable } from "./loans-table";
import { ExportButton } from "./export-button";
import { LoanImportPanel } from "./import-panel";
import { Plus } from "lucide-react";

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    officer?: string;
    maturity?: string;
    sort?: string;
    dir?: string;
    page?: string;
    mine?: string;
    tag?: string;
  }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const sortField = sp.sort || "created_at";
  const sortDir = sp.dir === "asc";
  const SORTABLE_DB_FIELDS = [
    "created_at",
    "loan_amount",
    "interest_rate",
    "term_months",
    "status",
    "maturity_date",
  ];
  const dbSort = SORTABLE_DB_FIELDS.includes(sortField)
    ? sortField
    : "created_at";

  let query = supabase
    .from("loans")
    .select(`
      *,
      property:properties(*),
      loan_borrowers(
        is_primary,
        borrower:borrowers(*)
      ),
      loan_officer:profiles!loans_loan_officer_id_fkey(full_name)
    `)
    .order(dbSort, { ascending: sortDir, nullsFirst: false });

  if (sp.status && sp.status !== "all") {
    query = query.eq("status", sp.status);
  }

  // Tag filter
  if (sp.tag && sp.tag !== "all") {
    query = query.contains("tags", [sp.tag]);
  }

  // Officer filter (explicit takes precedence over "mine")
  if (sp.officer && sp.officer !== "all") {
    if (sp.officer === "unassigned") {
      query = query.is("loan_officer_id", null);
    } else {
      query = query.eq("loan_officer_id", sp.officer);
    }
  } else if (sp.mine === "1" && user) {
    query = query.eq("loan_officer_id", user.id);
  }

  const { data: allLoans } = await query;

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("role", ["admin", "loan_officer"])
    .order("full_name", { ascending: true });

  // Distinct tags across all loans for the filter dropdown.
  // We re-query without the tag filter so the dropdown isn't self-narrowing.
  const { data: tagRows } = await supabase.from("loans").select("tags");
  const tagOptions = Array.from(
    new Set(((tagRows || []) as { tags: string[] | null }[]).flatMap((r) => r.tags || []))
  ).sort();

  // In-memory text search across property address and borrower name.
  // For larger datasets we'd push this to Postgres FTS or ilike.
  const search = sp.q?.trim().toLowerCase();
  let loans = search
    ? (allLoans || []).filter((l) => {
        const propStr = l.property
          ? `${l.property.address_street} ${l.property.address_city} ${l.property.address_state} ${l.property.address_zip}`.toLowerCase()
          : "";
        const borrowerStr = (l.loan_borrowers || [])
          .map(
            (lb: {
              borrower: {
                first_name?: string | null;
                last_name?: string | null;
                entity_name?: string | null;
              };
            }) =>
              [
                lb.borrower?.first_name,
                lb.borrower?.last_name,
                lb.borrower?.entity_name,
              ]
                .filter(Boolean)
                .join(" ")
          )
          .join(" ")
          .toLowerCase();
        return propStr.includes(search) || borrowerStr.includes(search);
      })
    : allLoans || [];

  // Maturity filter (computed in memory)
  if (sp.maturity && sp.maturity !== "all") {
    const now = Date.now();
    loans = loans.filter((l) => {
      if (!l.maturity_date) return false;
      const days = Math.ceil(
        (new Date(l.maturity_date + "T00:00:00Z").getTime() - now) /
          (1000 * 60 * 60 * 24)
      );
      if (sp.maturity === "overdue") return days < 0;
      const limit = parseInt(sp.maturity || "0");
      return days >= 0 && days <= limit;
    });
  }

  // Pagination
  const PAGE_SIZE = 50;
  const page = Math.max(1, parseInt(sp.page || "1"));
  const total = loans.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageLoans = loans.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Build pagination link helper
  function pageHref(p: number) {
    const next = new URLSearchParams();
    if (sp.status) next.set("status", sp.status);
    if (sp.q) next.set("q", sp.q);
    if (sp.officer) next.set("officer", sp.officer);
    if (sp.maturity) next.set("maturity", sp.maturity);
    if (sp.sort) next.set("sort", sp.sort);
    if (sp.dir) next.set("dir", sp.dir);
    next.set("page", String(p));
    return `/admin/loans?${next.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Loans</h1>
        <div className="flex gap-2">
          <ExportButton />
          <Button nativeButton={false} render={<Link href="/admin/loans/new" />}>
            <Plus className="mr-2 h-4 w-4" />
            New Loan
          </Button>
        </div>
      </div>

      <LoanImportPanel />

      <LoansFilter staff={staff || []} tagOptions={tagOptions} />

      <LoansTable loans={pageLoans as never} staff={staff || []} />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {total} loan{total === 1 ? "" : "s"} · Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="hover:underline">
                ← Previous
              </Link>
            )}
            {page < totalPages && (
              <Link href={pageHref(page + 1)} className="hover:underline">
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
