-- Phase 6: E-signature request tracking
-- Stub schema for tracking signature requests. Real provider integration
-- (DocuSeal / DocuSign / Dropbox Sign) is wired separately when API keys exist.

create type signature_status as enum (
  'draft',
  'sent',
  'viewed',
  'signed',
  'declined',
  'expired'
);

create type signature_document_type as enum (
  'term_sheet',
  'promissory_note',
  'personal_guarantee',
  'deed_of_trust',
  'mortgage',
  'closing_package',
  'other'
);

create table signature_requests (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  document_type signature_document_type not null,
  status signature_status not null default 'draft',
  signer_borrower_id uuid references borrowers(id),
  signer_email text not null,
  signer_name text not null,
  provider text, -- 'docuseal' | 'docusign' | 'dropbox_sign' | null while stubbed
  provider_envelope_id text,
  signed_document_path text, -- supabase storage path once complete
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  declined_at timestamptz,
  declined_reason text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_signature_requests_loan on signature_requests(loan_id);
create index idx_signature_requests_status on signature_requests(status);
create trigger set_updated_at before update on signature_requests for each row execute function update_updated_at();

alter table signature_requests enable row level security;

create policy "Staff can manage signature requests"
  on signature_requests for all
  using (is_staff());

create policy "Borrowers can view own signature requests"
  on signature_requests for select
  using (
    exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where lb.loan_id = signature_requests.loan_id
      and b.user_id = auth.uid()
    )
  );
