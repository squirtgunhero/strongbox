-- Payment intents: borrower flags "I sent a wire / mailed a check" so staff
-- can match it when funds arrive. Distinct from `payments` (which are the
-- actual recorded ledger entries).

create type payment_intent_status as enum (
  'submitted',
  'verified',
  'cleared',
  'rejected'
);

create type payment_intent_method as enum (
  'wire',
  'ach',
  'check',
  'cashiers_check',
  'other'
);

create table payment_intents (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  borrower_id uuid references borrowers(id),
  amount numeric(14,2) not null check (amount > 0),
  method payment_intent_method not null default 'wire',
  reference_number text,
  sent_date date not null,
  expected_arrival_date date,
  notes text,
  status payment_intent_status not null default 'submitted',
  matched_payment_id uuid references payments(id),
  rejected_reason text,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_payment_intents_loan on payment_intents(loan_id);
create index idx_payment_intents_status on payment_intents(status);
create trigger set_updated_at before update on payment_intents for each row execute function update_updated_at();

alter table payment_intents enable row level security;

create policy "Staff can manage payment intents"
  on payment_intents for all
  using (is_staff());

create policy "Borrowers can view own payment intents"
  on payment_intents for select
  using (
    exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where lb.loan_id = payment_intents.loan_id
      and b.user_id = auth.uid()
    )
  );

create policy "Borrowers can submit payment intents on own loans"
  on payment_intents for insert
  with check (
    exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where lb.loan_id = payment_intents.loan_id
      and b.user_id = auth.uid()
    )
    and status = 'submitted'
  );
