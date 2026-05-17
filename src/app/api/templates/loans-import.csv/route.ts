export async function GET() {
  const csv = [
    "borrower_type,first_name,last_name,entity_name,borrower_email,borrower_phone,formation_state,deals_completed,address_street,address_city,address_state,address_zip,property_type,purchase_price,as_is_value,after_repair_value,rehab_budget,loan_amount,interest_rate,points,term_months,day_count,loan_purpose,exit_strategy,status,origination_date,funded_date,maturity_date",
    "individual,Jane,Doe,,,555-111-2222,,2,123 Main St,Dallas,TX,75001,single_family,350000,420000,500000,75000,300000,12,2,12,actual_360,purchase,sale,lead,2026-05-01,,2027-05-01",
    "entity,,,Acme Holdings LLC,ops@acmeholdings.com,555-333-4444,CA,7,44 Beacon Ave,Phoenix,AZ,85001,commercial,900000,1100000,1350000,200000,700000,0.11,0.015,18,actual_365,refinance,rental,application,2026-04-15,,2027-10-15",
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="loans-import-template.csv"',
    },
  });
}
