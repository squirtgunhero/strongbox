import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { LOAN_STATUS_LABELS, type LoanStatus } from "@/lib/types";
import { DollarSign, FileText, AlertTriangle, Clock } from "lucide-react";

export default async function AdminDashboard() {
  const supabase = await createClient();

  const { data: loans } = await supabase.from("loans").select("*");

  const allLoans = loans || [];
  const activeLoans = allLoans.filter((l) =>
    ["funded", "active"].includes(l.status)
  );
  const totalDeployed = activeLoans.reduce(
    (sum, l) => sum + Number(l.current_principal),
    0
  );
  const defaultedLoans = allLoans.filter((l) => l.status === "defaulted");
  const pipelineLoans = allLoans.filter((l) =>
    ["lead", "application", "underwriting", "approved"].includes(l.status)
  );

  const statusCounts = allLoans.reduce(
    (acc, l) => {
      acc[l.status as LoanStatus] = (acc[l.status as LoanStatus] || 0) + 1;
      return acc;
    },
    {} as Record<LoanStatus, number>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Deployed
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalDeployed)}
            </div>
            <p className="text-xs text-muted-foreground">
              {activeLoans.length} active loan{activeLoans.length !== 1 && "s"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pipeline</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pipelineLoans.length}</div>
            <p className="text-xs text-muted-foreground">
              Leads through approved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Defaulted</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{defaultedLoans.length}</div>
            <p className="text-xs text-muted-foreground">
              Non-performing loans
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Loans</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allLoans.length}</div>
            <p className="text-xs text-muted-foreground">All statuses</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Loans by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-9">
            {(Object.keys(LOAN_STATUS_LABELS) as LoanStatus[]).map(
              (status) => (
                <div key={status} className="text-center">
                  <div className="text-lg font-semibold">
                    {statusCounts[status] || 0}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {LOAN_STATUS_LABELS[status]}
                  </div>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
