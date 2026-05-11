-- RLS cross-tenant validation
-- Creates two borrower users + loans, then impersonates each
-- and confirms they only see their own data.

begin;

-- Create two fake auth.users
insert into auth.users (id, email, encrypted_password, email_confirmed_at, instance_id, aud, role)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.com', 'fake', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.com', 'fake', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

-- Create their profiles as borrowers
insert into profiles (id, role, full_name, email) values
  ('11111111-1111-1111-1111-111111111111', 'borrower', 'Alice Test', 'alice@test.com'),
  ('22222222-2222-2222-2222-222222222222', 'borrower', 'Bob Test', 'bob@test.com');

-- Create two borrower records, each linked to one user
insert into borrowers (id, user_id, borrower_type, first_name, last_name, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'individual', 'Alice', 'Test', 'alice@test.com'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'individual', 'Bob', 'Test', 'bob@test.com');

-- Create two properties
insert into properties (id, address_street, address_city, address_state, address_zip) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '1 Alice St', 'Newark', 'NJ', '07101'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '2 Bob Ave', 'Newark', 'NJ', '07101');

-- Create one loan per borrower
insert into loans (id, property_id, status, loan_amount, current_principal, interest_rate, term_months) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'active', 250000, 250000, 0.12, 12),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'active', 350000, 350000, 0.11, 12);

insert into loan_borrowers (loan_id, borrower_id, is_primary) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);

-- TEST 1: Alice (borrower role) should see only her own loan
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}';

select 'Alice sees loans:' as test, count(*) as count from loans;
select 'Alice sees own loan id:' as test, id from loans;

select 'Alice sees borrowers:' as test, count(*) as count from borrowers;
select 'Alice sees own borrower:' as test, first_name from borrowers;

reset role;

-- TEST 2: Bob should see only his own loan
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}';

select 'Bob sees loans:' as test, count(*) as count from loans;
select 'Bob sees own loan id:' as test, id from loans;

reset role;

-- TEST 3: Admin (Michael) should see all
set local role authenticated;
set local "request.jwt.claims" = '{"sub":"56d483c5-7220-4acf-9bf6-4868e8a9d360","role":"authenticated"}';

select 'Admin sees loans:' as test, count(*) as count from loans;
select 'Admin sees borrowers:' as test, count(*) as count from borrowers;

reset role;

-- Cleanup
rollback;
