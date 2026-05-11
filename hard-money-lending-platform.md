# Hard Money Lending Platform

A complete build specification for a modern hard money lending management platform. Use this document as the source of truth when building with Claude Code.

## Overview

Hard money lending is short-term, asset-backed real estate lending. Loans are secured by the property itself rather than borrower creditworthiness. Typical terms run 6 to 24 months at 8 to 15 percent interest with 1 to 5 points in origination fees. The platform manages the full loan lifecycle from origination through servicing to payoff.

The product serves three primary users. Lenders and loan officers manage the pipeline, underwrite deals, and service active loans. Borrowers submit applications, upload documents, and track their loan status. Investors (when capital partners are involved) view their position, returns, and draw schedules.

## Tech Stack

Build on Next.js 15 with the App Router and TypeScript. Use Supabase for Postgres, auth, storage, and realtime. Style with Tailwind and shadcn/ui. Host on Vercel. Use Resend for transactional email and Twilio for SMS notifications. Use Stripe Connect or Dwolla for ACH disbursements and payment collection. Use Plaid for bank verification. Document generation through react-pdf or DocuSeal for e-signature flows.

## Core Data Model

### Loans

The loan is the central entity. Each loan has a status that moves through the pipeline: `lead`, `application`, `underwriting`, `approved`, `funded`, `active`, `paid_off`, `defaulted`, `foreclosure`. Track origination date, funded date, maturity date, interest rate, loan amount, points, and current principal balance.

Loans relate to one property, one or more borrowers (for joint applications), and optionally to investors who fund portions of the loan.

### Properties

Properties have an address, type (single family, multi-family, commercial, land, mixed-use), purchase price, after-repair value (ARV), current as-is value, rehab budget, and square footage. Track parcel number, county, and any liens. Store comps and BPO/appraisal documents.

### Borrowers

Borrowers can be individuals or entities (LLCs are most common in this space). For entities, track the EIN, formation state, and authorized signers. For individuals, track name, contact info, SSN (encrypted), and credit score if pulled. Most hard money lenders care more about experience than credit. Track prior deals completed.

### Draws

Construction/rehab loans use draw schedules. Each draw has a requested amount, approved amount, inspection requirement, status (requested, inspected, approved, funded, rejected), and the line items being drawn against from the rehab budget.

### Payments

Track every payment received. Type can be interest, principal, late fee, default interest, payoff, or escrow. Track due date, received date, amount, and apply payments according to the loan agreement waterfall.

### Documents

Every loan generates and collects documents. Track loan applications, term sheets, promissory notes, deeds of trust or mortgages, personal guarantees, title commitments, hazard insurance, payoff letters, and rehab budgets. Store in Supabase Storage with proper access controls.

### Investors

If the platform supports fractional or table funding by investors, model their positions. Track committed capital, deployed capital, returns earned, and which loans they have positions in.

## Feature Specification

### Loan Origination Pipeline

Build a kanban-style pipeline view showing loans by status. Each card shows the property address, borrower name, loan amount, days in current stage, and assigned loan officer. Click into the card to open the full loan detail view.

The application intake form collects property details, borrower info, requested loan amount, purpose (purchase, refinance, rehab, ground-up), exit strategy (sale, refinance, rental), and experience. Auto-pull property data from a service like RentCast or Estated when an address is entered.

### Underwriting

Underwriting calculates LTV (loan-to-value against as-is), LTC (loan-to-cost), and LTARV (loan-to-after-repair-value). Most hard money lenders cap at 65-75 percent LTARV. Build a deal scorecard that surfaces these ratios automatically and flags deals outside policy.

Pull credit (via a service like Experian Connect API or manual upload), verify entity registration, check background, and review the borrower's track record. Underwriters add notes, request additional docs, and approve or decline.

### Term Sheets and Loan Docs

Generate term sheets as PDFs with merge fields populated from the loan record. Include rate, points, fees, term length, prepayment terms, default rate, and conditions to close. Send for borrower e-signature.

At close, generate the full doc package: note, mortgage/deed of trust, personal guarantee, assignment of rents, environmental indemnity, and any state-specific addenda. Route through DocuSeal or DocuSign with proper signing order.

### Servicing Dashboard

Once funded, loans move to servicing. Show a portfolio view with total deployed capital, weighted average rate, average LTV, performing vs non-performing breakdown, and upcoming maturities (30, 60, 90 day buckets).

Generate monthly interest statements automatically and email/text them to borrowers. Track payment status with auto-flagging when payments are late. Calculate per-diem interest for payoff quotes on demand.

### Draw Management

Borrowers request draws through their portal. The system holds the request, schedules an inspection (manual or via a service like InspectIfy), then routes for approval. Once approved, trigger ACH disbursement and update the loan balance and remaining rehab budget.

Track draw history per loan and surface it in both the borrower portal and the internal admin view. Never disburse more than the remaining rehab holdback.

### Borrower Portal

Borrowers log in to see their loan(s), upcoming payment due dates, payment history, remaining draws, and any document requests. They can request payoff quotes, submit draw requests, upload documents, and update insurance info.

### Payoff and Maturity Management

Build a payoff calculator that takes a target payoff date and returns principal balance, accrued interest, any late fees, extension fees if applicable, and the total. Generate a payoff letter PDF on demand.

For approaching maturities, surface a worklist 90 days out so loan officers can engage borrowers about extensions or refinances. Track extension requests, fees collected, and new maturity dates.

### Investor Module (Optional)

If supporting capital partners, build investor accounts showing their committed capital, deployed positions per loan, monthly distributions, and YTD returns. Generate 1099s at year-end. Provide an investor portal mirroring the borrower portal pattern.

### Reporting

Build reports for portfolio performance, originations by month, payoffs by month, default rates, aging report (current, 30, 60, 90+), and concentration by geography or borrower. Export to CSV for accounting.

### Compliance

Hard money lending is regulated state by state. Some states require lending licenses, some restrict consumer-purpose loans, some cap rates. Build state-specific guardrails at the application stage so loans can't be originated in states the lender isn't licensed in. Generate required state disclosures automatically.

For TRID-covered loans (rare in hard money since most are business purpose), build the disclosure timing logic. For business-purpose loans, collect a business-purpose affidavit.

## Security Requirements

This platform handles SSNs, bank account numbers, and large dollar amounts. Treat it accordingly.

Encrypt SSNs and bank info at rest using pgsodium or a similar approach. Never log them. Use Supabase RLS on every table with policies enforcing that borrowers see only their own data, investors see only loans they have positions in, and admin access is role-based.

Enable MFA for all admin users. Audit log every state change on a loan, every document access, and every disbursement. Build the audit log as an append-only table with no update or delete permissions.

For ACH disbursements, require dual approval above a configurable threshold (e.g., $10,000). For payoff disbursements (returning principal to the lender), require confirmation against the recorded payoff statement.

## Build Order

Phase one: data model, auth, and admin shell. Get loan, property, borrower, and payment tables in place with full RLS. Build the loan list view, loan detail view, and the ability to manually create a loan record. This is the foundation.

Phase two: origination pipeline and underwriting. Build the application intake, pipeline kanban, underwriting scorecard, and document upload. Get a loan from lead to approved in the UI.

Phase three: servicing. Payment recording, interest accrual logic, monthly statements, payoff calculator, late fee automation. Make sure the math is bulletproof. Write tests for the interest accrual.

Phase four: borrower portal. Login, dashboard, payment history, document upload, payoff request.

Phase five: draws and disbursements. Draw request flow, inspection workflow, ACH integration, draw approval.

Phase six: documents and e-sign. Term sheet generation, loan doc package, e-signature routing.

Phase seven: investor module if needed.

Phase eight: reporting, compliance refinements, and admin polish.

## Critical Business Logic

### Interest Accrual

Most hard money loans accrue interest using a 360-day year (banker's interest) with actual days. Daily interest = principal × rate / 360. For a $500,000 loan at 12 percent, daily interest is $166.67. Payments are typically interest-only monthly with principal due at maturity.

Some loans use 365-day year. Make this configurable per loan and store the day-count convention with the loan record.

### Payment Application Waterfall

When a payment comes in, apply in this order: late fees, default interest, regular interest, escrow if any, then principal. Document this in the loan agreement and enforce in code.

### Default Interest

When a loan defaults, the rate often steps up (commonly to 18-24 percent or the maximum allowed by state law). Build a default toggle on the loan that triggers the higher rate from the default date forward. Track both the contract rate and the effective rate.

### Per-Diem Calculations

Payoff quotes need per-diem interest from the last paid-through date to the payoff date. Build this as a pure function so it can be unit tested.

### Extensions

Extensions typically require a fee (often 1-2 points of the loan amount) and update the maturity date. Track extension count and fees collected. Some loan documents limit the number of extensions.

## Integrations to Plan For

Property data: RentCast, Estated, or ATTOM Data for property records and valuations.

Credit and background: Experian Connect, TransUnion, or LexisNexis.

Banking: Plaid for bank verification and Stripe Connect, Dwolla, or Modern Treasury for ACH.

Title and escrow: Qualia or SoftPro integrations if the lender wants to pipe to their preferred title company.

Insurance verification: most lenders manually verify, but services exist for automation.

E-signature: DocuSeal (self-hosted, cheap), DocuSign (industry standard, expensive), or Dropbox Sign.

Accounting: QuickBooks Online API or Sage Intacct for GL sync.

CRM: optional sync to the existing CRM (Colony, HubSpot, Salesforce) for lead flow.

## File Structure

```
app/
  (admin)/
    loans/
    pipeline/
    borrowers/
    properties/
    investors/
    reports/
    settings/
  (borrower)/
    portal/
      loans/
      payments/
      documents/
      draws/
  (investor)/
    portal/
  api/
    loans/
    payments/
    draws/
    documents/
    webhooks/
      stripe/
      plaid/
      docuseal/
components/
  loans/
  borrowers/
  payments/
  shared/
lib/
  calculations/
    interest.ts
    payoff.ts
    ltv.ts
  integrations/
    plaid.ts
    stripe.ts
    rentcast.ts
  supabase/
    server.ts
    client.ts
    middleware.ts
  pdf/
    term-sheet.ts
    payoff-letter.ts
    monthly-statement.ts
db/
  migrations/
  seed.ts
  policies.sql
```

## Working with Claude Code

When starting a new session, point Claude at this file and the current state of the codebase. Ask it to read this spec before making changes. For each phase, work in tight loops: build the schema, build the API, build the UI, test the flow end to end, then commit.

For the financial math (interest, payoffs, payment application), write tests first. These are the parts that absolutely cannot have bugs. Use known loan scenarios with hand-calculated answers as the test fixtures.

For RLS policies, test them by attempting cross-tenant access from a borrower account and confirming it fails. Never trust RLS until you have proven it works.

When generating PDFs, render in HTML first to iterate on layout, then convert to PDF. Faster feedback loop than tweaking react-pdf directly.

Keep the loan detail page as the operational center of the platform. Everything a loan officer needs about a loan should be reachable from that one view: documents, payments, draws, notes, communication history, related entities, and actions (record payment, request draw, generate payoff, mark in default).

## Notes for Implementation

Hard money lenders have strong opinions about workflow because every shop runs slightly differently. Build the data model to be flexible (custom fields, configurable workflow stages, configurable doc templates) but ship with sensible defaults so the platform works out of the box.

The state machine on a loan matters. Don't let loans move backwards in status without an explicit action and audit trail. Don't allow funding without all required docs signed and conditions cleared.

Money movement is the highest-risk area. Build it last, build it carefully, require dual approval on disbursements, and reconcile against bank statements daily.

The borrower portal needs to be excellent because it deflects support calls. If a borrower can pull their own payoff, request their own draw, and download their own statements, the lender's operations team gets their time back.
