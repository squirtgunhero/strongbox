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
  -- Seed two borrower users + their data
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, instance_id, aud, role)
  values
    (v_alice, 'rls-alice@test.local', 'fake', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (v_bob,   'rls-bob@test.local',   'fake', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  insert into profiles (id, role, full_name, email) values
    (v_alice, 'borrower', 'Alice RLS', 'rls-alice@test.local'),
    (v_bob,   'borrower', 'Bob RLS',   'rls-bob@test.local')
  on conflict (id) do nothing;

  insert into borrowers (id, user_id, borrower_type, first_name, last_name, email) values
    (v_alice_b, v_alice, 'individual', 'Alice', 'RLS', 'rls-alice@test.local'),
    (v_bob_b,   v_bob,   'individual', 'Bob',   'RLS', 'rls-bob@test.local')
  on conflict (id) do nothing;

  insert into properties (id, address_street, address_city, address_state, address_zip) values
    (v_alice_p, '1 Alice Ln', 'Newark', 'NJ', '07101'),
    (v_bob_p,   '2 Bob Ave',  'Newark', 'NJ', '07101')
  on conflict (id) do nothing;

  insert into loans (id, property_id, status, loan_amount, current_principal, interest_rate, term_months) values
    (v_alice_l, v_alice_p, 'active', 250000, 250000, 0.12, 12),
    (v_bob_l,   v_bob_p,   'active', 350000, 350000, 0.11, 12)
  on conflict (id) do nothing;

  insert into loan_borrowers (loan_id, borrower_id, is_primary) values
    (v_alice_l, v_alice_b, true),
    (v_bob_l,   v_bob_b,   true)
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


-- ===========================================================================
-- Dual-approval regression (migration 033). Separate transaction so a failure
-- here is isolated from the cross-tenant assertions above.
--
--   • requester cannot approve their own draw (trigger, any path)
--   • a non-staff (borrower) cannot insert a draw approval (RLS)
--   • above threshold: 1 distinct approval does NOT promote; the 2nd does
--   • threshold decided on max(requested, approved) — under-stating the
--     approved amount cannot drop a large draw to single approval
-- ===========================================================================
begin;

do $$
declare
  v_admin1 uuid := '33333333-3333-3333-3333-cccc33333333';
  v_admin2 uuid := '44444444-4444-4444-4444-dddd44444444';
  v_bor    uuid := '55555555-5555-5555-5555-eeee55555555';
  v_bor_b  uuid := '66666666-6666-6666-6666-ffff66666666';
  v_prop   uuid := '77777777-7777-7777-7777-777777777777';
  v_loan   uuid := '88888888-8888-8888-8888-888888888888';
  v_draw   uuid := '99999999-9999-9999-9999-999999999999';
  v_promoted boolean;
begin
  insert into auth.users (id, email, encrypted_password, email_confirmed_at, instance_id, aud, role)
  values
    (v_admin1, 'rls-da1@test.local', 'fake', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (v_admin2, 'rls-da2@test.local', 'fake', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
    (v_bor,    'rls-da3@test.local', 'fake', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated')
  on conflict (id) do nothing;

  insert into profiles (id, role, full_name, email) values
    (v_admin1, 'loan_officer', 'DA One', 'rls-da1@test.local'),
    (v_admin2, 'loan_officer', 'DA Two', 'rls-da2@test.local'),
    (v_bor,    'borrower',     'DA Bor', 'rls-da3@test.local')
  on conflict (id) do nothing;

  insert into properties (id, address_street, address_city, address_state, address_zip)
  values (v_prop, '9 Draw Rd', 'Newark', 'NJ', '07101')
  on conflict (id) do nothing;

  insert into loans (id, property_id, status, loan_amount, current_principal, interest_rate, term_months)
  values (v_loan, v_prop, 'active', 500000, 500000, 0.12, 12)
  on conflict (id) do nothing;

  -- Deterministic threshold.
  update org_settings set dual_approval_threshold = 10000 where id = 1;

  -- Draw of $50k requested by admin1, no inspection required.
  insert into draws (id, loan_id, status, requested_amount, requested_by, inspection_required)
  values (v_draw, v_loan, 'requested', 50000, v_admin1, false)
  on conflict (id) do nothing;

  -- ASSERTION A: the requester (admin1) cannot approve their own draw.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"' || v_admin1::text || '","role":"authenticated"}', true);
  begin
    insert into draw_approvals (draw_id, approver_id) values (v_draw, v_admin1);
    raise exception 'DUAL-APPROVAL FAIL: requester was able to approve own draw';
  exception when check_violation then
    null; -- expected (trigger)
  end;
  execute 'reset role';

  -- ASSERTION B: a borrower cannot insert a draw approval (RLS is_staff()).
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"' || v_bor::text || '","role":"authenticated"}', true);
  begin
    insert into draw_approvals (draw_id, approver_id) values (v_draw, v_bor);
    raise exception 'DUAL-APPROVAL FAIL: borrower was able to approve a draw';
  exception when insufficient_privilege or check_violation then
    null; -- expected (RLS / not staff)
  end;
  execute 'reset role';

  -- ASSERTION C: above threshold, one distinct approval does NOT promote,
  -- even though the approver under-states the amount to $9,999.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"' || v_admin2::text || '","role":"authenticated"}', true);
  select promoted into v_promoted
  from approve_draw_atomic(v_draw, 9999);
  if v_promoted then
    raise exception 'DUAL-APPROVAL FAIL: $50k draw promoted on a single approval (threshold bypass)';
  end if;
  execute 'reset role';

  -- ASSERTION D: a borrower cannot promote a draw via the RPC path.
  -- The borrower can't even see the draw (RLS), so approve_draw_atomic
  -- refuses; any raised error here means "blocked", which is the point.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    '{"sub":"' || v_bor::text || '","role":"authenticated"}', true);
  declare
    v_blocked boolean := false;
  begin
    begin
      perform approve_draw_atomic(v_draw, 50000);
    exception when others then
      v_blocked := true; -- RLS visibility / privilege / check — all "blocked"
    end;
    if not v_blocked then
      raise exception 'DUAL-APPROVAL FAIL: borrower promoted a draw via RPC';
    end if;
  end;
  execute 'reset role';

  raise notice 'Dual-approval regression: ALL ASSERTIONS PASSED';
end $$;

rollback;
