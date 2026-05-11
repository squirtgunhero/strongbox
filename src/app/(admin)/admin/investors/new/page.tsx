import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InvestorForm } from "./investor-form";

export default function NewInvestorPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">New Investor</h1>
      <Card>
        <CardHeader>
          <CardTitle>Investor Details</CardTitle>
        </CardHeader>
        <CardContent>
          <InvestorForm />
        </CardContent>
      </Card>
    </div>
  );
}
