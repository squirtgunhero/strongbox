-- RLS regression test — assertion-based, fails the transaction on a
-- cross-tenant leak. Designed to run under `psql -v ON_ERROR_STOP=1`.
--
-- Usage:
--   psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f db/tests/rls_regression.sql
--
-- The test creates two borrower auth users + linked borrower/loan rows, then
-- impersonates each session via `set local role` + `request.jwt.claims` and
-- asserts each only sees their own data. Wrapped in a transaction that's
-- rolled back at the end so the database state is unchanged after a run.
--
-- New policy regressions to call out:
--   • borrowers PII columns (ssn_encrypted/ein_encrypted/notes/credit_score)
--     are revoked from the authenticated role at the column level (mig 024).
--   • audit_log INSERT pins performed_by to auth.uid() (mig 025).
--   • notifications direct UPDATE is revoked; only the RPC works (mig 026).

begin;

do $$
declare
  -- Both borrowers live in ONE org here: this suite tests within-org
  -- borrower-vs-borrower isolation (ownership/role based). Cross-org
  -- isolation is covered separately by org_isolation.sql.
  v_org   uuid := '99999999-9999-9999-9999-999999999999';
  v_alice uuid := '11111111-1111-1111-1111-aaaa11111111';
  v_bob   uuid := '22222222-2222-2222-2222-bbbb22222222';
  v_alice_b uuid := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_bob_b   uuid := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  v_alice_p uuid := 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  v_bob_p   uuid := 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  v_alice_l uuid := 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  v_bob_l   uuid := 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  v_count   int;
begin
  -- Seed the org first; every org-scoped insert below stamps org_id
  -- explicitly because seeding runs with no session (current_org_id() is
  -- null, so the enforce_org_id trigger requires an explicit value).
  insert into organizations (id, name, slug)
  values (v_org, 'RLS Test Org', 'rls-test-org')
  on conflict (id) do nothing;

  -- Seed two borrower users + their data
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, instance_id, aud, role)
  values
    (v_alice, 'rls-alice@test.local', 'fake', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (v_bob,   'rls-bob@test.local',   'fake', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  insert into profiles (id, role, full_name, email, org_id) values
    (v_alice, 'borrower', 'Alice RLS', 'rls-alice@test.local', v_org),
    (v_bob,   'borrower', 'Bob RLS',   'rls-bob@test.local',   v_org)
  on conflict (id) do nothing;

  insert into borrowers (id, user_id, borrower_type, first_name, last_name, email, org_id) values
    (v_alice_b, v_alice, 'individual', 'Alice', 'RLS', 'rls-alice@test.local', v_org),
    (v_bob_b,   v_bob,   'individual', 'Bob',   'RLS', 'rls-bob@test.local',   v_org)
  on conflict (id) do nothing;

  insert into properties (id, address_street, address_city, address_state, address_zip, org_id) values
    (v_alice_p, '1 Alice Ln', 'Newark', 'NJ', '07101', v_org),
    (v_bob_p,   '2 Bob Ave',  'Newark', 'NJ', '07101', v_org)
  on conflict (id) do nothing;

  insert into loans (id, property_id, status, loan_amount, current_principal, interest_rate, term_months, org_id) values
    (v_alice_l, v_alice_p, 'active', 250000, 250000, 0.12, 12, v_org),
    (v_bob_l,   v_bob_p,   'active', 350000, 350000, 0.11, 12, v_org)
  on conflict (id) do nothing;

  insert into loan_borrowers (loan_id, borrower_id, is_primary, org_id) values
    (v_alice_l, v_alice_b, true, v_org),
    (v_bob_l,   v_bob_b,   true, v_org)
  on conflict (loan_id, borrower_id) do nothing;

  -- ASSERTION 1: Alice sees exactly one loan — her own.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"' || v_alice::text || '","role":"authenticated"}', true);

  select count(*) into v_count from loans;
  if v_count <> 1 then
    raise exception 'RLS FAIL: Alice should see 1 loan, saw %', v_count;
  end if;

  select count(*) into v_count from loans where id = v_bob_l;
  if v_count <> 0 then
    raise exception 'RLS FAIL: Alice can see Bob''s loan!';
  end if;

  -- ASSERTION 2: Alice cannot SELECT borrower PII columns
  begin
    perform ssn_encrypted from borrowers where id = v_alice_b;
    raise exception 'RLS FAIL: Alice could SELECT ssn_encrypted (column-level grant leaked)';
  exception when insufficient_privilege then
    -- expected
    null;
  end;

  -- ASSERTION 3: Alice cannot write an audit_log row attributing to Bob
  begin
    insert into audit_log (table_name, record_id, action, performed_by)
    values ('loans', v_alice_l, 'access', v_bob);
    raise exception 'RLS FAIL: Alice forged an audit_log row with performed_by=Bob';
  exception when check_violation or insufficient_privilege then
    null;
  -- RLS WITH CHECK failure surfaces as `new row violates row-level security policy`
  when others then
    if sqlerrm not like '%row-level security%' then
      raise;
    end if;
  end;

  -- ASSERTION 4: Alice cannot directly UPDATE her notifications (revoked)
  begin
    update notifications set subject = 'pwn' where recipient_user_id = v_alice;
    -- If we got here without error, check that it had no effect (zero rows
    -- updated is OK; an actual privilege error would have raised already).
    -- The migration revokes UPDATE entirely, so this should error.
    raise exception 'RLS FAIL: Alice can directly UPDATE her notifications';
  exception when insufficient_privilege then
    null;
  end;

  execute 'reset role';

  -- ASSERTION 5: Bob sees exactly his own loan.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"' || v_bob::text || '","role":"authenticated"}', true);

  select count(*) into v_count from loans;
  if v_count <> 1 then
    raise exception 'RLS FAIL: Bob should see 1 loan, saw %', v_count;
  end if;

  select count(*) into v_count from loans where id = v_alice_l;
  if v_count <> 0 then
    raise exception 'RLS FAIL: Bob can see Alice''s loan!';
  end if;

  execute 'reset role';

  raise notice 'RLS regression: ALL ASSERTIONS PASSED';
end $$;

-- Discard all the fixture rows.
rollback;
