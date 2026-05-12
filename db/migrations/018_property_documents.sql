-- Property-scoped documents (comps, surveys, photos, deed records, etc.)
-- These are not loan-specific — they belong to the property and may be
-- referenced across multiple loans on the same property.

create type property_document_category as enum (
  'photo',
  'comp',
  'survey',
  'appraisal',
  'bpo',
  'deed',
  'plat_map',
  'environmental',
  'other'
);

create table property_documents (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references properties(id) on delete cascade,
  category property_document_category not null default 'other',
  filename text not null,
  storage_path text not null,
  size_bytes bigint,
  mime_type text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_property_documents_property on property_documents(property_id);

-- Reuse the loan-documents bucket but key under property/<id>/ path
-- (no separate bucket needed)

alter table property_documents enable row level security;

create policy "Staff can manage property documents"
  on property_documents for all
  using (is_staff());

-- Borrowers can view property documents on properties tied to their loans
create policy "Borrowers can view property docs on own loans' properties"
  on property_documents for select
  using (
    exists (
      select 1 from loans l
      join loan_borrowers lb on lb.loan_id = l.id
      join borrowers b on b.id = lb.borrower_id
      where l.property_id = property_documents.property_id
      and b.user_id = auth.uid()
    )
  );

-- Storage: extend admin/borrower rules. Property docs live under
-- property/<property_id>/<filename> in the loan-documents bucket.
create policy "Staff can manage property docs in bucket"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'loan-documents'
    and is_staff()
    and (string_to_array(name, '/'))[1] = 'property'
  );
