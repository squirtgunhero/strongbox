-- Phase 0 (multi-org retrofit): add org_id to every org-scoped table.
-- Columns are nullable here; 035 backfills then enforces NOT NULL.
-- org_id is denormalized onto child tables (not derived through FK
-- chains) so the restrictive RLS policy in 036 is a single indexed column
-- check rather than a recursive parent lookup.

-- Identity / core
alter table profiles            add column if not exists org_id uuid references organizations(id);
alter table properties          add column if not exists org_id uuid references organizations(id);
alter table borrowers           add column if not exists org_id uuid references organizations(id);
alter table loans               add column if not exists org_id uuid references organizations(id);
alter table loan_borrowers      add column if not exists org_id uuid references organizations(id);
alter table payments            add column if not exists org_id uuid references organizations(id);
alter table audit_log           add column if not exists org_id uuid references organizations(id);

-- Origination
alter table loan_notes          add column if not exists org_id uuid references organizations(id);
alter table loan_documents      add column if not exists org_id uuid references organizations(id);
alter table loan_conditions     add column if not exists org_id uuid references organizations(id);
alter table condition_templates add column if not exists org_id uuid references organizations(id);

-- Draws
alter table draws               add column if not exists org_id uuid references organizations(id);
alter table draw_line_items     add column if not exists org_id uuid references organizations(id);
alter table draw_approvals      add column if not exists org_id uuid references organizations(id);

-- Signatures / documents
alter table signature_requests  add column if not exists org_id uuid references organizations(id);
alter table property_documents  add column if not exists org_id uuid references organizations(id);

-- Investors
alter table investors               add column if not exists org_id uuid references organizations(id);
alter table investor_positions      add column if not exists org_id uuid references organizations(id);
alter table investor_distributions  add column if not exists org_id uuid references organizations(id);

-- Servicing / ops
alter table payment_intents     add column if not exists org_id uuid references organizations(id);
alter table notifications       add column if not exists org_id uuid references organizations(id);
alter table org_settings        add column if not exists org_id uuid references organizations(id);

-- Indexes for the restrictive org predicate (added in 036).
create index if not exists idx_profiles_org            on profiles(org_id);
create index if not exists idx_properties_org          on properties(org_id);
create index if not exists idx_borrowers_org           on borrowers(org_id);
create index if not exists idx_loans_org               on loans(org_id);
create index if not exists idx_loan_borrowers_org      on loan_borrowers(org_id);
create index if not exists idx_payments_org            on payments(org_id);
create index if not exists idx_audit_log_org           on audit_log(org_id);
create index if not exists idx_loan_notes_org          on loan_notes(org_id);
create index if not exists idx_loan_documents_org      on loan_documents(org_id);
create index if not exists idx_loan_conditions_org     on loan_conditions(org_id);
create index if not exists idx_condition_templates_org on condition_templates(org_id);
create index if not exists idx_draws_org               on draws(org_id);
create index if not exists idx_draw_line_items_org     on draw_line_items(org_id);
create index if not exists idx_draw_approvals_org      on draw_approvals(org_id);
create index if not exists idx_signature_requests_org  on signature_requests(org_id);
create index if not exists idx_property_documents_org  on property_documents(org_id);
create index if not exists idx_investors_org           on investors(org_id);
create index if not exists idx_investor_positions_org  on investor_positions(org_id);
create index if not exists idx_investor_distributions_org on investor_distributions(org_id);
create index if not exists idx_payment_intents_org     on payment_intents(org_id);
create index if not exists idx_notifications_org       on notifications(org_id);
create index if not exists idx_org_settings_org        on org_settings(org_id);

-- Intentionally NOT org-scoped:
--   organizations       (the org registry itself)
--   rate_limit_attempts (keyed by pre-auth identifier/IP; no session org)

-- ---------------------------------------------------------------------
-- Org resolver + organizations RLS policies.
-- Defined here (not in 033) because they depend on profiles.org_id,
-- which the statements above just created.
-- ---------------------------------------------------------------------

-- Resolves the calling user's organization. SECURITY DEFINER so the
-- lookup itself is not subject to RLS (mirrors the existing
-- is_staff()/is_admin() pattern). STABLE so the planner can cache it
-- within a statement. Can later be swapped for a JWT claim without
-- changing any policy.
create or replace function current_org_id()
returns uuid as $$
  select org_id from profiles where id = auth.uid();
$$ language sql security definer stable;

-- Lock search_path on the security-definer helper (same hardening 025
-- applied to is_staff/is_admin) so a poisoned schema can't redirect the
-- profiles lookup.
alter function current_org_id() set search_path = public, pg_temp;

-- Users can see their own org; only admins of that org can rename it.
create policy "Members can view their organization"
  on organizations for select
  using (id = current_org_id());

create policy "Org admins can update their organization"
  on organizations for update
  using (id = current_org_id() and is_admin())
  with check (id = current_org_id() and is_admin());

-- Org creation/suspension is an out-of-band service-role operation
-- (provisioning a new lending shop), so no INSERT/DELETE policy is
-- granted to authenticated users by design.
