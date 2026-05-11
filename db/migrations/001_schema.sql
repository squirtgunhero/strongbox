-- StrongBox Phase 1: Core Schema
-- Run against your Supabase project SQL editor

-- Enums
create type loan_status as enum (
  'lead',
  'application',
  'underwriting',
  'approved',
  'funded',
  'active',
  'paid_off',
  'defaulted',
  'foreclosure'
);

create type property_type as enum (
  'single_family',
  'multi_family',
  'commercial',
  'land',
  'mixed_use'
);

create type loan_purpose as enum (
  'purchase',
  'refinance',
  'rehab',
  'ground_up'
);

create type exit_strategy as enum (
  'sale',
  'refinance',
  'rental'
);

create type borrower_type as enum (
  'individual',
  'entity'
);

create type payment_type as enum (
  'interest',
  'principal',
  'late_fee',
  'default_interest',
  'payoff',
  'escrow'
);

create type day_count_convention as enum (
  'actual_360',
  'actual_365'
);

-- Profiles (extends Supabase auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'borrower' check (role in ('admin', 'loan_officer', 'borrower', 'investor')),
  full_name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Properties
create table properties (
  id uuid primary key default gen_random_uuid(),
  address_street text not null,
  address_city text not null,
  address_state text not null,
  address_zip text not null,
  property_type property_type not null default 'single_family',
  purchase_price numeric(14,2),
  as_is_value numeric(14,2),
  after_repair_value numeric(14,2),
  rehab_budget numeric(14,2),
  square_footage integer,
  parcel_number text,
  county text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Borrowers
create table borrowers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  borrower_type borrower_type not null default 'individual',
  -- Individual fields
  first_name text,
  last_name text,
  email text,
  phone text,
  ssn_encrypted text, -- encrypted at rest via pgsodium or app-layer
  credit_score integer,
  -- Entity fields
  entity_name text,
  ein_encrypted text,
  formation_state text,
  -- Shared
  deals_completed integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint borrower_name_check check (
    (borrower_type = 'individual' and first_name is not null and last_name is not null)
    or (borrower_type = 'entity' and entity_name is not null)
  )
);

-- Loans
create table loans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references properties(id),
  status loan_status not null default 'lead',
  loan_purpose loan_purpose,
  exit_strategy exit_strategy,
  -- Financial terms
  loan_amount numeric(14,2) not null,
  interest_rate numeric(5,4) not null, -- stored as decimal, e.g. 0.12 = 12%
  default_rate numeric(5,4), -- stepped-up rate on default
  points numeric(5,4), -- origination fee as decimal
  day_count day_count_convention not null default 'actual_360',
  term_months integer not null,
  -- Balances
  current_principal numeric(14,2) not null,
  -- Dates
  origination_date date,
  funded_date date,
  maturity_date date,
  default_date date,
  -- Status flags
  is_defaulted boolean not null default false,
  -- Extensions
  extension_count integer not null default 0,
  max_extensions integer,
  extension_fee_points numeric(5,4),
  -- Assignment
  loan_officer_id uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Join table for joint borrower applications
create table loan_borrowers (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  borrower_id uuid not null references borrowers(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (loan_id, borrower_id)
);

-- Payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references loans(id) on delete cascade,
  payment_type payment_type not null,
  amount numeric(14,2) not null,
  -- Waterfall breakdown
  applied_to_late_fees numeric(14,2) not null default 0,
  applied_to_default_interest numeric(14,2) not null default 0,
  applied_to_interest numeric(14,2) not null default 0,
  applied_to_escrow numeric(14,2) not null default 0,
  applied_to_principal numeric(14,2) not null default 0,
  due_date date not null,
  received_date date,
  notes text,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Audit log (append-only)
create table audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null check (action in ('insert', 'update', 'status_change', 'access', 'disbursement')),
  old_values jsonb,
  new_values jsonb,
  performed_by uuid references profiles(id),
  ip_address inet,
  created_at timestamptz not null default now()
);

-- Revoke update/delete on audit_log for all roles except postgres
revoke update, delete on audit_log from anon, authenticated, service_role;

-- Indexes
create index idx_loans_status on loans(status);
create index idx_loans_loan_officer on loans(loan_officer_id);
create index idx_loans_property on loans(property_id);
create index idx_payments_loan on payments(loan_id);
create index idx_payments_due_date on payments(due_date);
create index idx_loan_borrowers_loan on loan_borrowers(loan_id);
create index idx_loan_borrowers_borrower on loan_borrowers(borrower_id);
create index idx_borrowers_user on borrowers(user_id);
create index idx_audit_log_record on audit_log(table_name, record_id);
create index idx_audit_log_created on audit_log(created_at);

-- Updated_at trigger function
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on profiles for each row execute function update_updated_at();
create trigger set_updated_at before update on properties for each row execute function update_updated_at();
create trigger set_updated_at before update on borrowers for each row execute function update_updated_at();
create trigger set_updated_at before update on loans for each row execute function update_updated_at();
