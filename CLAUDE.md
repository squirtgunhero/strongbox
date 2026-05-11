# CLAUDE.md

This is the working context file for Claude Code on the StrongBox hard money lending platform. Read this at the start of every session before making changes.

## Project

StrongBox is a hard money lending management platform. Full product specification lives in `hard-money-lending-platform.md` in the repo root. Read that file before any non-trivial work.

## How We Work Together

Start every session by reading `hard-money-lending-platform.md` and the current state of the codebase. Before writing code, confirm which phase we are in and what the next concrete step is.

When proposing changes, lead with the plan. For schema changes, show the migration before running it. For new features, sketch the data flow and file changes before implementing. I want to catch design issues at the proposal stage, not after the code is written.

Work in tight loops. Build schema, build API, build UI, test end to end, commit. Do not stack multiple unrelated changes in one commit.

## Build Order

We build in phases. Do not skip ahead.

1. Data model, auth, admin shell
2. Origination pipeline and underwriting
3. Servicing (payments, interest, statements, payoffs)
4. Borrower portal
5. Draws and disbursements
6. Documents and e-signature
7. Investor module
8. Reporting and compliance polish

Confirm the current phase before starting work. If a request would jump ahead, flag it.

## Non-Negotiables

Financial math gets tests first. Interest accrual, payment application waterfall, per-diem, payoff calculations. Hand-calculate the expected values, write the test, then write the function. These cannot have bugs.

RLS policies on every table. Test them by attempting cross-tenant access from a borrower account and confirming it fails. Never trust RLS until proven.

Money movement requires dual approval above the configured threshold. Build the approval flow before building the disbursement integration.

Audit log every state change on a loan, every document access, every disbursement. Append-only table, no update or delete permissions.

Encrypt SSNs and bank account numbers at rest. Never log them. Never return them in API responses unless explicitly requested by an authorized role.

## Code Style

Direct, low ceremony. No unnecessary abstractions until the second use case appears. Server components by default in Next.js, client components only when interactivity requires it. Colocate related code.

Comments explain why, not what. The code should be obvious enough that the what is self-evident.

## When Stuck

If a requirement in the spec is ambiguous, ask before guessing. If a technical choice has tradeoffs worth discussing, surface them with a recommendation. Do not silently pick a path on decisions that matter.

If you find yourself writing the same code in three places, stop and propose the abstraction before continuing.

## Out of Scope This Session Unless Told Otherwise

Refactors of code outside the current task. Dependency upgrades. Reformatting files not being edited. CI/CD changes. Adding new third-party services.

If any of these would genuinely help the task, ask first.
