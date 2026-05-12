create policy "Investors can view property docs on positioned loans' properties"
  on property_documents for select
  using (
    exists (
      select 1 from loans l
      join investor_positions ip on ip.loan_id = l.id
      join investors i on i.id = ip.investor_id
      where l.property_id = property_documents.property_id
      and i.user_id = auth.uid()
    )
  );
