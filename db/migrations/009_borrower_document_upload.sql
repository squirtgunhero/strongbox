-- Allow borrowers to upload documents on their own loans

create policy "Borrowers can insert documents on own loans"
  on loan_documents for insert
  with check (
    exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where lb.loan_id = loan_documents.loan_id
      and b.user_id = auth.uid()
    )
  );

-- Storage: borrowers can upload to their loan's path
create policy "Borrowers can upload to own loan documents bucket"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'loan-documents'
    and exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where b.user_id = auth.uid()
      and lb.loan_id::text = (string_to_array(name, '/'))[1]
    )
  );
