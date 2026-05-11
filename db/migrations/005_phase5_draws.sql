-- Phase 5: Draws & Disbursements

create type draw_status as enum (
  'requested',
  'inspected',
  'approved',
  'funded',
  'rejected'
);

-- Draws
create table draws (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  status draw_status not null default 'requested',
  requested_amount numeric(14,2) not null check (requested_amount > 0),
  approved_amount numeric(14,2),
  requested_at timestamptz not null default now(),
  requested_by uuid references profiles(id),
  inspection_required boolean not null default true,
  inspection_completed_at timestamptz,
  inspector_notes text,
  inspector_id uuid references profiles(id),
  rejected_reason text,
  funded_at timestamptz,
  funded_by uuid references profiles(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_draws_loan on draws(loan_id);
create index idx_draws_status on draws(status);
create trigger set_updated_at before update on draws for each row execute function update_updated_at();

-- Line items per draw (against rehab budget)
create table draw_line_items (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references draws(id) on delete cascade,
  description text not null,
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now()
);

create index idx_draw_line_items_draw on draw_line_items(draw_id);

-- Append-only approval log. Two distinct approvers required for amounts above threshold.
create table draw_approvals (
  id uuid primary key default gen_random_uuid(),
  draw_id uuid not null references draws(id) on delete cascade,
  approver_id uuid not null references profiles(id),
  approved_at timestamptz not null default now(),
  notes text,
  unique (draw_id, approver_id)
);

create index idx_draw_approvals_draw on draw_approvals(draw_id);

-- Block updates/deletes on approvals (append-only)
revoke update, delete on draw_approvals from anon, authenticated, service_role;

-- RLS
alter table draws enable row level security;
alter table draw_line_items enable row level security;
alter table draw_approvals enable row level security;

create policy "Staff can manage draws"
  on draws for all
  using (is_staff());

create policy "Borrowers can view own draws"
  on draws for select
  using (
    exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where lb.loan_id = draws.loan_id
      and b.user_id = auth.uid()
    )
  );

create policy "Borrowers can request draws on own loans"
  on draws for insert
  with check (
    exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where lb.loan_id = draws.loan_id
      and b.user_id = auth.uid()
    )
    and status = 'requested'
  );

create policy "Staff can manage draw line items"
  on draw_line_items for all
  using (is_staff());

create policy "Borrowers can view own draw line items"
  on draw_line_items for select
  using (
    exists (
      select 1 from draws d
      join loan_borrowers lb on lb.loan_id = d.loan_id
      join borrowers b on b.id = lb.borrower_id
      where d.id = draw_line_items.draw_id
      and b.user_id = auth.uid()
    )
  );

create policy "Borrowers can insert own draw line items"
  on draw_line_items for insert
  with check (
    exists (
      select 1 from draws d
      join loan_borrowers lb on lb.loan_id = d.loan_id
      join borrowers b on b.id = lb.borrower_id
      where d.id = draw_line_items.draw_id
      and b.user_id = auth.uid()
    )
  );

create policy "Staff can view all draw approvals"
  on draw_approvals for select
  using (is_staff());

create policy "Staff can insert draw approvals"
  on draw_approvals for insert
  with check (is_staff() and approver_id = auth.uid());
