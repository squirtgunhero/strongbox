-- Cross-organization isolation regression — assertion-based, fails the
-- transaction on any leak. Run under `psql -v ON_ERROR_STOP=1`.
--
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f db/tests/org_isolation.sql
--
-- The critical case: an org ADMIN. The role-based "is_staff()/is_admin()
-- manage all" policies are unbounded by org; only the RESTRICTIVE
-- org_isolation policy (036) stops an admin of shop A from reading or
-- writing shop B. These assertions exist to prove that holds.
--
-- Wrapped in a transaction that is rolled back, so DB state is unchanged.

begin;

do $$
declare
  o1 uuid := '0a0a0a0a-0000-0000-0000-000000000001';
  o2 uuid := '0b0b0b0b-0000-0000-0000-000000000002';
  admin1 uuid := '1a1a1a1a-0000-0000-0000-000000000001';
  admin2 uuid := '2a2a2a2a-0000-0000-0000-000000000002';
  prop1 uuid := 'c1c1c1c1-0000-0000-0000-000000000001';
  prop2 uuid := 'c2c2c2c2-0000-0000-0000-000000000002';
  loan1 uuid := 'e1e1e1e1-0000-0000-0000-000000000001';
  loan2 uuid := 'e2e2e2e2-0000-0000-0000-000000000002';
  v_count int;
begin
  -- Two organizations, each with its own admin and one loan.
  insert into organizations (id, name, slug) values
    (o1, 'Shop One', 'shop-one'),
    (o2, 'Shop Two', 'shop-two')
  on conflict (id) do nothing;

  insert into auth.users (id, email, encrypted_password, email_confirmed_at, instance_id, aud, role)
  values
    (admin1, 'oi-admin1@test.local', 'fake', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (admin2, 'oi-admin2@test.local', 'fake', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  insert into profiles (id, role, full_name, email, org_id) values
    (admin1, 'admin', 'Admin One', 'oi-admin1@test.local', o1),
    (admin2, 'admin', 'Admin Two', 'oi-admin2@test.local', o2)
  on conflict (id) do nothing;

  insert into properties (id, address_street, address_city, address_state, address_zip, org_id) values
    (prop1, '1 Shop One Way', 'Newark', 'NJ', '07101', o1),
    (prop2, '2 Shop Two Way', 'Newark', 'NJ', '07101', o2)
  on conflict (id) do nothing;

  insert into loans (id, property_id, status, loan_amount, current_principal, interest_rate, term_months, org_id) values
    (loan1, prop1, 'active', 250000, 250000, 0.12, 12, o1),
    (loan2, prop2, 'active', 350000, 350000, 0.11, 12, o2)
  on conflict (id) do nothing;

  ----------------------------------------------------------------------
  -- Shop One admin session
  ----------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"' || admin1::text || '","role":"authenticated"}', true);

  -- ASSERTION 1: admin sees only their own org's loans (restrictive
  -- policy must contain the unbounded is_staff()/is_admin() policy).
  select count(*) into v_count from loans;
  if v_count <> 1 then
    raise exception 'ORG FAIL: Shop One admin should see 1 loan, saw %', v_count;
  end if;

  select count(*) into v_count from loans where id = loan2;
  if v_count <> 0 then
    raise exception 'ORG FAIL: Shop One admin can READ Shop Two loan';
  end if;

  -- ASSERTION 2: admin cannot UPDATE another org's loan.
  update loans set loan_amount = 1 where id = loan2;
  if found then
    raise exception 'ORG FAIL: Shop One admin UPDATEd Shop Two loan';
  end if;

  -- ASSERTION 3: admin cannot INSERT a loan into another org
  -- (restrictive WITH CHECK + enforce_org_id trigger).
  begin
    insert into loans (property_id, status, loan_amount, current_principal, interest_rate, term_months, org_id)
    values (prop1, 'active', 1, 1, 0.1, 12, o2);
    raise exception 'ORG FAIL: Shop One admin INSERTed a loan into Shop Two';
  exception
    when check_violation or insufficient_privilege then null;
    when others then
      if sqlerrm not like '%row-level security%'
         and sqlerrm not like '%cross-org%' then raise;
      end if;
  end;

  execute 'reset role';

  ----------------------------------------------------------------------
  -- Shop Two admin session (symmetric)
  ----------------------------------------------------------------------
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"' || admin2::text || '","role":"authenticated"}', true);

  select count(*) into v_count from loans;
  if v_count <> 1 then
    raise exception 'ORG FAIL: Shop Two admin should see 1 loan, saw %', v_count;
  end if;

  select count(*) into v_count from loans where id = loan1;
  if v_count <> 0 then
    raise exception 'ORG FAIL: Shop Two admin can READ Shop One loan';
  end if;

  execute 'reset role';

  raise notice 'Org isolation: ALL ASSERTIONS PASSED';
end $$;

rollback;
