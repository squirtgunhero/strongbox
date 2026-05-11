-- Phase 7: Investor Module

create type investor_type as enum ('individual', 'entity');

create table investors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  investor_type investor_type not null default 'individual',
  full_name text,
  entity_name text,
  email text not null,
  phone text,
  tax_id_encrypted text, -- SSN or EIN, encrypted
  committed_capital numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investor_name_check check (
    (investor_type = 'individual' and full_name is not null)
    or (investor_type = 'entity' and entity_name is not null)
  )
);

create index idx_investors_user on investors(user_id);
create trigger set_updated_at before update on investors for each row execute function update_updated_at();

-- A single loan can have multiple investors. Each position holds either a
-- dollar amount, a percentage, or both — at insert time we compute the
-- percentage based on the loan amount. The percentage drives distributions.
create table investor_positions (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references investors(id) on delete cascade,
  loan_id uuid not null references loans(id) on delete cascade,
  amount numeric(14,2) not null check (amount > 0),
  percentage numeric(7,6) not null check (percentage > 0 and percentage <= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (investor_id, loan_id)
);

create index idx_investor_positions_investor on investor_positions(investor_id);
create index idx_investor_positions_loan on investor_positions(loan_id);
create trigger set_updated_at before update on investor_positions for each row execute function update_updated_at();

-- Distributions paid to investors. Always tied to a source payment from
-- the borrower so reconciliation is possible.
create table investor_distributions (
  id uuid primary key default gen_random_uuid(),
  investor_id uuid not null references investors(id),
  loan_id uuid not null references loans(id),
  payment_id uuid references payments(id),
  amount numeric(14,2) not null check (amount >= 0),
  distribution_date date not null,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_investor_distributions_investor on investor_distributions(investor_id);
create index idx_investor_distributions_loan on investor_distributions(loan_id);
create index idx_investor_distributions_payment on investor_distributions(payment_id);

-- Investors role exists already in profiles; add to enum check
-- (profiles.role already includes 'investor')

alter table investors enable row level security;
alter table investor_positions enable row level security;
alter table investor_distributions enable row level security;

create policy "Staff can manage investors"
  on investors for all
  using (is_staff());

create policy "Investors can view own record"
  on investors for select
  using (user_id = auth.uid());

create policy "Staff can manage investor positions"
  on investor_positions for all
  using (is_staff());

create policy "Investors can view own positions"
  on investor_positions for select
  using (
    exists (
      select 1 from investors i
      where i.id = investor_positions.investor_id
      and i.user_id = auth.uid()
    )
  );

-- Investors can view loans they have positions in (extend existing loan RLS)
create policy "Investors can view positioned loans"
  on loans for select
  using (
    exists (
      select 1 from investor_positions ip
      join investors i on i.id = ip.investor_id
      where ip.loan_id = loans.id
      and i.user_id = auth.uid()
    )
  );

create policy "Staff can manage investor distributions"
  on investor_distributions for all
  using (is_staff());

create policy "Investors can view own distributions"
  on investor_distributions for select
  using (
    exists (
      select 1 from investors i
      where i.id = investor_distributions.investor_id
      and i.user_id = auth.uid()
    )
  );
