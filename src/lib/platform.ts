/**
 * Fixed id of the reserved "StrongBox Platform" organization seeded in
 * db/migrations/038_platform_admins.sql. Used to stamp platform-level
 * audit entries (backup crons, support-session events) that belong to no
 * customer org. Must stay in sync with that migration.
 *
 * The restrictive org_isolation RLS policy guarantees no real org can read
 * rows owned by this org — they are visible only to the service role and
 * the platform console.
 */
export const PLATFORM_ORG_ID = "00000000-0000-0000-0000-0000000000a1";
