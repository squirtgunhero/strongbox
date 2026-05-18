#!/usr/bin/env bash
# Apply pending SQL migrations to the database, tracked in schema_migrations.
#
# Why this exists: migrations were historically applied by hand, which is
# tribal knowledge and error-prone. This runner applies only files that have
# not been recorded yet, each in its own transaction, and records them.
#
# BASELINE: the first time it runs against a database that has no
# schema_migrations table, it assumes the database is already at the current
# repo state (every existing migration is live) and seeds the table WITHOUT
# re-running anything. That is true for StrongBox today: prod is at 033 and
# the repo is at 033. From then on, only newly added files are applied.
#
# Usage:  SUPABASE_DB_URL=postgres://... bash scripts/migrate.sh
set -euo pipefail

if [[ -z "${SUPABASE_DB_URL:-}" ]]; then
  echo "SUPABASE_DB_URL is not set — skipping migrations."
  # Exit 0 so the workflow stays green until the secret is configured.
  exit 0
fi

PSQL=(psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -tA)

migrations_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)/db/migrations"
shopt -s nullglob
mapfile -t files < <(printf '%s\n' "$migrations_dir"/[0-9]*.sql | sort)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "No migration files found."
  exit 0
fi

table_exists="$("${PSQL[@]}" -c "select to_regclass('public.schema_migrations') is not null")"

"${PSQL[@]}" -c "
  create table if not exists schema_migrations (
    filename text primary key,
    applied_at timestamptz not null default now()
  );
"

if [[ "$table_exists" != "t" ]]; then
  echo "First run: baselining existing migrations as already-applied."
  for f in "${files[@]}"; do
    base="$(basename "$f")"
    "${PSQL[@]}" -c "insert into schema_migrations (filename) values ('$base')
                     on conflict (filename) do nothing;"
    echo "  baselined $base"
  done
  echo "Baseline complete. Nothing to apply."
  exit 0
fi

applied=0
for f in "${files[@]}"; do
  base="$(basename "$f")"
  seen="$("${PSQL[@]}" -c "select 1 from schema_migrations where filename = '$base'")"
  if [[ "$seen" == "1" ]]; then
    continue
  fi
  echo ">> applying $base"
  # Each migration runs in its own transaction; a failure aborts the run
  # (set -e) and leaves later migrations unapplied.
  psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$f"
  "${PSQL[@]}" -c "insert into schema_migrations (filename) values ('$base');"
  echo "   recorded $base"
  applied=$((applied + 1))
done

echo "Done. $applied migration(s) applied."
