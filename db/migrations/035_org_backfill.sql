-- Phase 0 (multi-org retrofit): backfill existing data, enforce NOT NULL,
-- install the insert-stamping guard, and convert org_settings to per-org.
-- Safe on existing data: nullable -> backfill -> constrain.

-- 1. The single existing data set becomes one default organization.
insert into organizations (name, slug)
values ('Default Lender', 'default')
on conflict (slug) do nothing;

-- 2. Backfill every org-scoped table to that organization.
do $$
declare
  o uuid := (select id from organizations where slug = 'default');
  tbl text;
begin
  foreach tbl in array array[
    'profiles','properties','borrowers','loans','loan_borrowers','payments',
    'audit_log','loan_notes','loan_documents','loan_conditions',
    'condition_templates','draws','draw_line_items','draw_approvals',
    'signature_requests','property_documents','investors',
    'investor_positions','investor_distributions','payment_intents',
    'notifications','org_settings'
  ]
  loop
    execute format('update %I set org_id = $1 where org_id is null', tbl)
      using o;
  end loop;
end $$;

-- 3. Enforce NOT NULL now that every row has an organization.
alter table profiles            alter column org_id set not null;
alter table properties          alter column org_id set not null;
alter table borrowers           alter column org_id set not null;
alter table loans               alter column org_id set not null;
alter table loan_borrowers      alter column org_id set not null;
alter table payments            alter column org_id set not null;
alter table audit_log           alter column org_id set not null;
alter table loan_notes          alter column org_id set not null;
alter table loan_documents      alter column org_id set not null;
alter table loan_conditions     alter column org_id set not null;
alter table condition_templates alter column org_id set not null;
alter table draws               alter column org_id set not null;
alter table draw_line_items     alter column org_id set not null;
alter table draw_approvals      alter column org_id set not null;
alter table signature_requests  alter column org_id set not null;
alter table property_documents  alter column org_id set not null;
alter table investors               alter column org_id set not null;
alter table investor_positions      alter column org_id set not null;
alter table investor_distributions  alter column org_id set not null;
alter table payment_intents     alter column org_id set not null;
alter table notifications       alter column org_id set not null;

-- 4. org_settings: singleton -> one row per organization.
-- Drop the dead singleton key column entirely (it was `id integer primary
-- key default 1`; the PK retained NOT NULL on id even after the PK is
-- dropped, which would block every per-org insert). org_settings is now
-- keyed solely by org_id.
alter table org_settings drop constraint if exists singleton;
alter table org_settings drop column if exists id;
alter table org_settings alter column org_id set not null;
alter table org_settings add primary key (org_id);

-- 5. Insert guard. Fails closed:
--   * authenticated user: org_id is stamped from their session and any
--     attempt to write into another org is rejected;
--   * service role (no auth.uid(), so current_org_id() is null): MUST
--     pass org_id explicitly or the insert errors. This is the DB-side
--     backstop for the service-role app scoping.
create or replace function enforce_org_id()
returns trigger as $$
declare
  caller_org uuid := current_org_id();
begin
  if new.org_id is null then
    new.org_id := caller_org;
  end if;

  if new.org_id is null then
    raise exception 'org_id required: no session org and none provided (table %)', tg_table_name
      using errcode = 'check_violation';
  end if;

  if caller_org is not null and new.org_id <> caller_org then
    raise exception 'cross-org write rejected on % (session % attempted %)',
      tg_table_name, caller_org, new.org_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$ language plpgsql;

do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'profiles','properties','borrowers','loans','loan_borrowers','payments',
    'audit_log','loan_notes','loan_documents','loan_conditions',
    'condition_templates','draws','draw_line_items','draw_approvals',
    'signature_requests','property_documents','investors',
    'investor_positions','investor_distributions','payment_intents',
    'notifications','org_settings'
  ]
  loop
    execute format(
      'create trigger enforce_org_id before insert on %I
         for each row execute function enforce_org_id()', tbl);
  end loop;
end $$;
