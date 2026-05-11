-- Let investors view documents on loans they have positions in

create policy "Investors can view docs on positioned loans"
  on loan_documents for select
  using (
    exists (
      select 1 from investor_positions ip
      join investors i on i.id = ip.investor_id
      where ip.loan_id = loan_documents.loan_id
      and i.user_id = auth.uid()
    )
  );

-- Same on Storage
create policy "Investors can read positioned-loan documents bucket"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'loan-documents'
    and exists (
      select 1 from investor_positions ip
      join investors i on i.id = ip.investor_id
      where i.user_id = auth.uid()
      and ip.loan_id::text = (string_to_array(name, '/'))[1]
    )
  );
