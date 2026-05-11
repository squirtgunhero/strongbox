-- Phase 2: Origination pipeline & underwriting

-- Loan notes (underwriter/officer notes per loan)
create table loan_notes (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  author_id uuid references profiles(id),
  body text not null,
  created_at timestamptz not null default now()
);

create index idx_loan_notes_loan on loan_notes(loan_id);
create index idx_loan_notes_created on loan_notes(created_at desc);

-- Loan documents (metadata; files live in Supabase Storage)
create type document_category as enum (
  'application',
  'term_sheet',
  'promissory_note',
  'deed_of_trust',
  'personal_guarantee',
  'title_commitment',
  'hazard_insurance',
  'appraisal',
  'bpo',
  'rehab_budget',
  'payoff_letter',
  'entity_docs',
  'bank_statement',
  'tax_return',
  'other'
);

create table loan_documents (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  category document_category not null default 'other',
  filename text not null,
  storage_path text not null,
  size_bytes bigint,
  mime_type text,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create index idx_loan_documents_loan on loan_documents(loan_id);

-- Loan conditions (closing checklist)
create table loan_conditions (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  description text not null,
  is_satisfied boolean not null default false,
  satisfied_at timestamptz,
  satisfied_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_loan_conditions_loan on loan_conditions(loan_id);
create trigger set_updated_at before update on loan_conditions for each row execute function update_updated_at();

-- RLS
alter table loan_notes enable row level security;
alter table loan_documents enable row level security;
alter table loan_conditions enable row level security;

-- Notes: staff full access; borrowers cannot see notes (internal)
create policy "Staff can manage loan notes"
  on loan_notes for all
  using (is_staff());

-- Documents: staff full access; borrowers can view docs on their loans
create policy "Staff can manage loan documents"
  on loan_documents for all
  using (is_staff());

create policy "Borrowers can view own loan documents"
  on loan_documents for select
  using (
    exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where lb.loan_id = loan_documents.loan_id
      and b.user_id = auth.uid()
    )
  );

-- Conditions: staff full access; borrowers can view conditions on their loans
create policy "Staff can manage loan conditions"
  on loan_conditions for all
  using (is_staff());

create policy "Borrowers can view own loan conditions"
  on loan_conditions for select
  using (
    exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where lb.loan_id = loan_conditions.loan_id
      and b.user_id = auth.uid()
    )
  );
