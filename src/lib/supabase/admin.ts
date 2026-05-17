import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Tables that carry org_id (must match db/migrations/034). The
 * org-scoped admin client auto-filters/stamps these; everything else
 * passes through untouched.
 */
const ORG_SCOPED_TABLES = new Set<string>([
  "profiles",
  "properties",
  "borrowers",
  "loans",
  "loan_borrowers",
  "payments",
  "audit_log",
  "loan_notes",
  "loan_documents",
  "loan_conditions",
  "condition_templates",
  "draws",
  "draw_line_items",
  "draw_approvals",
  "signature_requests",
  "property_documents",
  "investors",
  "investor_positions",
  "investor_distributions",
  "payment_intents",
  "notifications",
  "org_settings",
]);

function rawServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Service-role client with NO organization scoping. Bypasses RLS entirely.
 *
 * ONLY for genuinely org-agnostic operations: Supabase Auth user
 * management, database/storage backups, IP-keyed rate limiting, and
 * pre-session password reset. Every call site is a deliberate,
 * greppable decision — if the data is org-owned, use
 * createOrgAdminClient instead.
 */
export function createUnscopedAdminClient(): SupabaseClient | null {
  return rawServiceClient();
}

type FromBuilder = ReturnType<SupabaseClient["from"]>;

/**
 * Service-role client pinned to a single organization. RLS is still
 * bypassed (service role), but `.from()` on an org-scoped table:
 *   - filters select/update/delete by org_id, and
 *   - forces org_id on insert/upsert payloads (caller cannot override).
 *
 * This makes a forgotten org filter impossible on the scoped tables,
 * complementing the enforce_org_id DB trigger (035) as defense in depth.
 * Non-scoped tables (e.g. rate_limit_attempts) pass straight through.
 *
 * `.raw` exposes the unscoped client for Auth admin calls and other
 * org-agnostic needs from the same handler.
 */
export function createOrgAdminClient(orgId: string) {
  const base = rawServiceClient();
  if (!base) return null;

  const stamp = (v: Record<string, unknown>) => ({
    ...v,
    org_id: orgId,
  });

  return {
    raw: base,
    from(table: string): FromBuilder {
      const builder = base.from(table);
      if (!ORG_SCOPED_TABLES.has(table)) return builder;

      return new Proxy(builder, {
        get(target, prop, receiver) {
          if (prop === "insert") {
            return (values: unknown) => {
              const payload = Array.isArray(values)
                ? values.map((v) => stamp(v as Record<string, unknown>))
                : stamp(values as Record<string, unknown>);
              return (target as FromBuilder).insert(payload);
            };
          }
          if (prop === "upsert") {
            return (values: unknown, opts?: unknown) => {
              const payload = Array.isArray(values)
                ? values.map((v) => stamp(v as Record<string, unknown>))
                : stamp(values as Record<string, unknown>);
              return (
                target as unknown as {
                  upsert: (v: unknown, o?: unknown) => unknown;
                }
              ).upsert(payload, opts);
            };
          }
          if (prop === "select" || prop === "update" || prop === "delete") {
            return (...args: unknown[]) => {
              const q = (
                target as unknown as Record<
                  string,
                  (...a: unknown[]) => { eq: (c: string, v: string) => unknown }
                >
              )[prop](...args);
              return q.eq("org_id", orgId);
            };
          }
          return Reflect.get(target, prop, receiver);
        },
      }) as FromBuilder;
    },
  };
}

