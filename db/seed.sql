-- StrongBox demo seed
-- Idempotent — safe to re-run. Inserts a small dataset for demos:
--   • 1 borrower (Acme Holdings LLC)
--   • 1 investor (Maple Capital)
--   • 2 properties (one rehab, one funded multifamily)
--   • 3 loans across statuses: application / funded-active / paid-off
--   • payment history on the funded loan
--   • an investor position + one quarterly distribution
--
-- Run AFTER applying all numbered migrations. Run AFTER creating at least one
-- admin profile (the seed needs a loan_officer_id). It will look up the first
-- admin profile by role and attribute everything to them.

do $$
declare
  v_officer_id uuid;
  v_borrower_id uuid := '11111111-1111-1111-1111-111111111111';
  v_investor_id uuid := '22222222-2222-2222-2222-222222222222';
  v_prop_active uuid := '33333333-3333-3333-3333-333333333331';
  v_prop_payoff uuid := '33333333-3333-3333-3333-333333333332';
  v_prop_app uuid := '33333333-3333-3333-3333-333333333333';
  v_loan_active uuid := '44444444-4444-4444-4444-444444444441';
  v_loan_payoff uuid := '44444444-4444-4444-4444-444444444442';
  v_loan_app uuid := '44444444-4444-4444-4444-444444444443';
begin
  select id into v_officer_id
    from profiles where role in ('admin','loan_officer') order by created_at limit 1;
  if v_officer_id is null then
    raise notice 'No admin/loan_officer profile found — create one first, then re-run seed.';
    return;
  end if;

  -- Borrower
  insert into borrowers (id, borrower_type, entity_name, email, phone, formation_state, deals_completed)
  values (v_borrower_id, 'entity', 'Acme Holdings LLC', 'demo+borrower@strongbox.test', '+15555550101', 'NY', 3)
  on conflict (id) do update set entity_name = excluded.entity_name;

  -- Investor
  insert into investors (id, investor_type, entity_name, email, phone)
  values (v_investor_id, 'entity', 'Maple Capital Partners', 'demo+investor@strongbox.test', '+15555550102')
  on conflict (id) do update set entity_name = excluded.entity_name;

  -- Properties
  insert into properties (id, address_street, address_city, address_state, address_zip,
                          property_type, purchase_price, as_is_value, after_repair_value, rehab_budget)
  values
    (v_prop_active, '482 Knickerbocker Ave', 'Brooklyn', 'NY', '11221',
     'multi_family', 1450000, 1450000, 1900000, 220000),
    (v_prop_payoff, '15 Mercer St', 'Jersey City', 'NJ', '07302',
     'single_family', 650000, 720000, 820000, 60000),
    (v_prop_app, '88 Greenpoint Ave', 'Brooklyn', 'NY', '11222',
     'mixed_use', 2200000, 2200000, 2750000, 320000)
  on conflict (id) do update set address_street = excluded.address_street;

  -- Loans
  insert into loans (id, property_id, status, loan_purpose, exit_strategy,
                     loan_amount, interest_rate, default_rate, points,
                     day_count, term_months, current_principal,
                     origination_date, funded_date, maturity_date, loan_officer_id)
  values
    (v_loan_active, v_prop_active, 'active', 'rehab', 'sale',
     1450000, 0.1100, 0.2400, 0.0200, 'actual_360', 12, 1450000,
     current_date - interval '60 days', current_date - interval '60 days',
     current_date + interval '305 days', v_officer_id),
    (v_loan_payoff, v_prop_payoff, 'paid_off', 'purchase', 'sale',
     520000, 0.1175, 0.2400, 0.0200, 'actual_360', 9, 0,
     current_date - interval '300 days', current_date - interval '300 days',
     current_date - interval '30 days', v_officer_id),
    (v_loan_app, v_prop_app, 'application', 'rehab', 'refinance',
     1980000, 0.1150, 0.2400, 0.0225, 'actual_360', 12, 1980000,
     null, null, null, v_officer_id)
  on conflict (id) do update set status = excluded.status;

  -- Link borrower
  insert into loan_borrowers (loan_id, borrower_id, is_primary)
  values
    (v_loan_active, v_borrower_id, true),
    (v_loan_payoff, v_borrower_id, true),
    (v_loan_app, v_borrower_id, true)
  on conflict (loan_id, borrower_id) do nothing;

  -- A monthly interest payment history on the active loan (2 payments received)
  insert into payments (loan_id, payment_type, amount,
                        applied_to_interest, applied_to_principal,
                        due_date, received_date, recorded_by)
  values
    (v_loan_active, 'interest', 13291.67, 13291.67, 0,
     current_date - interval '30 days', current_date - interval '29 days', v_officer_id),
    (v_loan_active, 'interest', 13291.67, 13291.67, 0,
     current_date, current_date, v_officer_id)
  on conflict do nothing;

  -- Investor takes a 50% participation in the active loan
  insert into investor_positions (investor_id, loan_id, amount, percentage)
  values (v_investor_id, v_loan_active, 725000, 0.500000)
  on conflict (investor_id, loan_id) do update set amount = excluded.amount;

  raise notice 'Seed complete. Loans: active=%, paid_off=%, application=%',
    v_loan_active, v_loan_payoff, v_loan_app;
end $$;
