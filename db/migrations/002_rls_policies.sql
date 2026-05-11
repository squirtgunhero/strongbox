-- StrongBox Phase 1: Row Level Security Policies
-- Run after 001_schema.sql

alter table profiles enable row level security;
alter table properties enable row level security;
alter table borrowers enable row level security;
alter table loans enable row level security;
alter table loan_borrowers enable row level security;
alter table payments enable row level security;
alter table audit_log enable row level security;

-- Helper: check if current user is admin or loan_officer
create or replace function is_staff()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role in ('admin', 'loan_officer')
  );
$$ language sql security definer stable;

-- Helper: check if current user is admin
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$ language sql security definer stable;

-- Profiles
create policy "Users can view own profile"
  on profiles for select
  using (id = auth.uid());

create policy "Staff can view all profiles"
  on profiles for select
  using (is_staff());

create policy "Users can update own profile"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "Admin can manage profiles"
  on profiles for all
  using (is_admin());

-- Properties: staff full access, borrowers read their own (via loan)
create policy "Staff can manage properties"
  on properties for all
  using (is_staff());

create policy "Borrowers can view properties on their loans"
  on properties for select
  using (
    exists (
      select 1 from loans l
      join loan_borrowers lb on lb.loan_id = l.id
      join borrowers b on b.id = lb.borrower_id
      where l.property_id = properties.id
      and b.user_id = auth.uid()
    )
  );

-- Borrowers: staff full access, borrowers see own record
create policy "Staff can manage borrowers"
  on borrowers for all
  using (is_staff());

create policy "Borrowers can view own record"
  on borrowers for select
  using (user_id = auth.uid());

create policy "Borrowers can update own record"
  on borrowers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Loans: staff full access, borrowers see own
create policy "Staff can manage loans"
  on loans for all
  using (is_staff());

create policy "Borrowers can view own loans"
  on loans for select
  using (
    exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where lb.loan_id = loans.id
      and b.user_id = auth.uid()
    )
  );

-- Loan_borrowers: staff full access, borrowers see own
create policy "Staff can manage loan_borrowers"
  on loan_borrowers for all
  using (is_staff());

create policy "Borrowers can view own loan_borrowers"
  on loan_borrowers for select
  using (
    exists (
      select 1 from borrowers b
      where b.id = loan_borrowers.borrower_id
      and b.user_id = auth.uid()
    )
  );

-- Payments: staff full access, borrowers see own
create policy "Staff can manage payments"
  on payments for all
  using (is_staff());

create policy "Borrowers can view own payments"
  on payments for select
  using (
    exists (
      select 1 from loan_borrowers lb
      join borrowers b on b.id = lb.borrower_id
      where lb.loan_id = payments.loan_id
      and b.user_id = auth.uid()
    )
  );

-- Audit log: admin read-only, insert for service_role and authenticated
create policy "Admin can view audit log"
  on audit_log for select
  using (is_admin());

create policy "Authenticated can insert audit log"
  on audit_log for insert
  with check (true);
