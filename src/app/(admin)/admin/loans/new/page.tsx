import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoanForm } from "./loan-form";

export default function NewLoanPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">New Loan</h1>
      <Card>
        <CardHeader>
          <CardTitle>Loan Details</CardTitle>
        </CardHeader>
        <CardContent>
          <LoanForm />
        </CardContent>
      </Card>
    </div>
  );
}
