export async function GET() {
  const csv = [
    "borrower_type,first_name,last_name,entity_name,email,phone,formation_state,deals_completed,notes",
    "individual,Jane,Doe,,jane@example.com,555-111-2222,,3,Repeat borrower",
    "entity,,,Acme Holdings LLC,ops@acmeholdings.com,555-333-4444,CA,9,Primary LLC borrower",
  ].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="borrowers-import-template.csv"',
    },
  });
}
