# StrongBox

Hard money lending operating system. Origination pipeline → underwriting →
servicing → payoff, with borrower and investor portals.

Built on Next.js 16 (App Router) + Supabase (Postgres + Auth + Storage + RLS) +
Resend for email + Vitest for the financial math.

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.local.example .env.local   # then fill in the values

# 3. Apply schema (see "Database setup" below)

# 4. Run
npm run dev
```

Visit http://localhost:3000.

## Environment variables

See `.env.local.example` for the full list. The required ones to boot:

| Variable | Why |
| -- | -- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public publishable key (PostgREST + browser auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only — staff invites, cron jobs, webhook handlers |
| `NEXT_PUBLIC_APP_URL` | Used to build invite / password-reset redirect URLs |

Optional but used by feature flags:

| Variable | Used for |
| -- | -- |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Outbound email |
| `RESEND_WEBHOOK_SECRET` | Verifying delivery/bounce webhooks (Svix signing) |
| `CRON_SECRET` | Authenticating cron requests to `/api/cron/*` |
| `TWILIO_*` | SMS delivery stub |

## Database setup

The schema lives in `db/migrations/` as numbered SQL files. Apply them in order
into your Supabase Postgres. From a fresh project:

```bash
# Get the pooled connection string from Supabase → Project Settings → Database
export SUPABASE_DB_URL='postgresql://postgres.<ref>:<password>@aws-…pooler.supabase.com:6543/postgres'

# Apply all migrations in order
for f in db/migrations/[0-9]*.sql; do
  echo ">> $f"
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f "$f" || break
done
```

After that, optionally apply demo seed data:

```bash
psql "$SUPABASE_DB_URL" -f db/seed.sql
```

The seed creates a demo borrower, an investor, two properties, three loans
across statuses (application / funded / paid off), and the default org settings
row. Run it after creating an admin user so the seed can attribute loans to a
loan officer.

## Auth and roles

The schema enforces four roles, stored on `profiles.role`:

- `admin` — full access
- `loan_officer` — same as admin minus settings + investor management
- `borrower` — sees only their own loans, payments, documents
- `investor` — sees only loans they have a position in, plus distribution history

Cross-tenant access is enforced by RLS on every table. The non-negotiables
(per `CLAUDE.md`):

- **Dual approval** on disbursements above `org_settings.dual_approval_threshold`
- **Audit log** is append-only — every state change, document access, and
  disbursement writes a row; the INSERT policy pins `performed_by = auth.uid()`
- **PII columns** (`borrowers.ssn_encrypted`, `borrowers.ein_encrypted`,
  `borrowers.notes`, `investors.tax_id_encrypted`) have column-level SELECT
  revoked from the `authenticated` role (migration 024). Staff PII reads route
  through the service-role admin client and audit each access.
- **Service-role server actions** all run through `requireStaff()` / `requireAdmin()`
  (in `src/lib/auth/require-staff.ts`) before invoking the elevated client.

## Testing

```bash
npm test             # vitest run — 72 tests on financial math
npm run test:watch   # watch mode
SUPABASE_DB_URL=… npm run test:rls   # assertion-based RLS regression
```

The math test suites cover interest accrual (actual/360 and actual/365),
default-rate split-period interest, payment waterfall application,
per-diem, payoff calculations, holdback draws, investor distributions,
and reporting helpers.

The RLS regression test (`db/tests/rls_regression.sql`) impersonates two
borrower sessions and asserts:

- Each only sees their own loans (cross-tenant SELECT returns zero rows)
- Neither can SELECT borrower PII columns
- Neither can forge an audit_log row with a spoofed `performed_by`
- Neither can directly UPDATE notifications

The test wraps everything in a transaction and rolls back, so the database
state is unchanged after a run.

## Build & deploy

```bash
npm run build        # production build
npm run start        # serve the build locally
```

The app is deployed via Vercel (`vercel.json` lives in repo root). Push to
`main` and Vercel auto-builds; or run `npx vercel --prod`.

## Layout

```
src/app/
  (admin)/        Staff admin shell — pipeline, loans, draws, settings
  (auth)/         Login, forgot-password, reset-password
  (investor)/     Investor portal — positions, distributions, 1099
  (portal)/       Borrower portal — loans, payments, documents
  (documents)/    HTML→PDF document templates
  api/            Webhooks, CSV reports, cron jobs
src/lib/
  calculations/   Pure financial math (tested)
  supabase/       Server, browser, and service-role clients
  auth/           Role guards (requireStaff / requireAdmin / requireRole)
  uploads/        File validation (magic bytes + extension allowlist)
db/migrations/    Numbered SQL — apply in order
db/seed.sql       Optional demo dataset
```

## Working notes

Read `CLAUDE.md` at the repo root before making changes — it documents the
build order, non-negotiables, and the "show the migration before running it"
workflow we follow.

See `hard-money-lending-platform.md` for the full product spec.

## Integrations

Each external integration ships as an adapter behind an interface, so
switching providers means writing a single class. Adapters check their env
vars on construction and resolve to a no-op stub when keys are missing —
the StrongBox UI keeps working, it just doesn't dispatch external calls.

| Integration | File | Provider | Env vars |
| -- | -- | -- | -- |
| E-signature | `src/lib/esign/` | DocuSign (JWT grant) | `DOCUSIGN_BASE_URL`, `DOCUSIGN_ACCOUNT_ID`, `DOCUSIGN_INTEGRATION_KEY`, `DOCUSIGN_USER_ID`, `DOCUSIGN_PRIVATE_KEY`, `DOCUSIGN_WEBHOOK_HMAC_KEY` |
| ACH payments | `src/lib/payments/` | Stripe (PaymentIntents, us_bank_account) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| Property data | `src/lib/property/` | RentCast (AVM + rent estimate) | `RENTCAST_API_KEY` |
| Credit pull | `src/lib/credit/` | None wired — interface only | (see below) |

Webhooks:

- DocuSign Connect → `/api/webhooks/docusign` (HMAC verified)
- Stripe → `/api/webhooks/stripe` (signature verified, 5-min replay window)
- Resend → `/api/webhooks/resend` (Svix HMAC verified)

To enable an integration, fill in its env vars and redeploy. No code change
needed — the runtime check flips from stub to live on the next request.

Concentration analysis (`src/lib/calculations/concentration.ts`) runs on
every admin dashboard load and surfaces a banner when one borrower or one
state exceeds the configured threshold in `org_settings`.

MFA is enforced when `org_settings.require_mfa_for_staff = true`. Staff
without an AAL2 session are redirected to `/admin/security/mfa` for TOTP
enrollment or challenge. Toggle from `/admin/settings`. Enroll one admin
first or you'll lock yourself out.

## Known gaps (pre-customer testing)

- **Credit pull**: no bureau adapter shipped. The interface lives at
  `src/lib/credit/`. Wiring Experian / Equifax / TransUnion requires a signed
  credentials agreement and is a procurement step, not a code task.
- **Document → PDF rendering for e-sign**: the DocuSign adapter currently
  attaches a minimal placeholder PDF. Wire the existing HTML→PDF document
  templates (`src/app/(documents)/*`) into the e-sign flow before sending
  real envelopes.
- **MFA recovery**: no admin-side "reset a user's MFA" flow yet. If a staff
  member loses their authenticator, delete the row from `auth.mfa_factors`
  via Supabase Studio.
- **No e2e auth tests**: Playwright covers anonymous smoke (login renders,
  /admin redirects, generic error on bad password). Authenticated flows
  require seeding a test user — wire that into a `e2e/auth.setup.ts` per
  Playwright's auth-storage-state pattern when you add the integrations.
