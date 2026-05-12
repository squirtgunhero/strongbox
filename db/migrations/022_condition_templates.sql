-- DB-backed condition templates (replaces the hard-coded list).
-- Admins can create/edit templates; staff can apply them.

create table condition_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  is_builtin boolean not null default false,
  conditions text[] not null default array[]::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on condition_templates for each row execute function update_updated_at();

alter table condition_templates enable row level security;

create policy "Staff can read condition templates"
  on condition_templates for select
  using (is_staff());

create policy "Admins can manage condition templates"
  on condition_templates for all
  using (is_admin());

-- Seed the four built-in templates that previously lived in TS
insert into condition_templates (name, is_builtin, conditions) values
  ('Purchase — Standard', true, array[
    'Clear title commitment with no material exceptions',
    'Hazard insurance with lender as mortgagee/loss payee',
    'Executed purchase contract',
    'Wire instructions verified with closing agent',
    'Borrower entity good standing certificate (if entity)',
    'Personal guarantee executed',
    'Government-issued ID for all signers'
  ]),
  ('Rehab Loan', true, array[
    'Clear title commitment with no material exceptions',
    'Hazard insurance — builder''s risk policy',
    'Detailed rehab budget reviewed and approved',
    'Contractor agreement on file',
    'Scope of work signed by borrower and contractor',
    'Permits for material work (if required by jurisdiction)',
    'Initial draw schedule agreed',
    'Personal guarantee executed'
  ]),
  ('Refinance', true, array[
    'Existing payoff letter from current lender',
    'Clear title commitment with no material exceptions',
    'Hazard insurance with lender as mortgagee',
    'Most recent property tax statement',
    'HOA estoppel certificate (if applicable)',
    'Personal guarantee executed'
  ]),
  ('Ground-Up Construction', true, array[
    'Clear title commitment with no material exceptions',
    'Builder''s risk insurance policy',
    'Detailed construction budget reviewed and approved',
    'GC license and insurance verified',
    'Plans and specs on file',
    'Building permit issued',
    'Initial draw schedule agreed',
    'Survey on file',
    'Soil report (if required)',
    'Personal guarantee executed'
  ]);
