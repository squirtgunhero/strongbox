-- Phase 2: Storage bucket for loan documents

-- Create the bucket (private, not public)
insert into storage.buckets (id, name, public)
values ('loan-documents', 'loan-documents', false)
on conflict (id) do nothing;

-- Storage RLS: staff can read/write all; borrowers can read docs on their loans
-- Path convention: loan-documents/{loan_id}/{filename}

create policy "Staff can manage all loan documents"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'loan-documents'
    and is_staff()
  );

create policy "Borrowers can read own loan documents"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'loan-documents'
    and exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where b.user_id = auth.uid()
      and lb.loan_id::text = (string_to_array(name, '/'))[1]
    )
  );
