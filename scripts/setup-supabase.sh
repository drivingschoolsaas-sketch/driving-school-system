#!/usr/bin/env bash
# ==================================================
# Supabase Setup Script
# ==================================================
# Run all migrations against a Supabase project.
# Usage: ./scripts/setup-supabase.sh
#
# Requires:
#   - SUPABASE_DB_URL (direct Postgres connection string)
#     Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
#
# Or for local Supabase:
#   - supabase CLI installed
#   - supabase start (runs local instance)

set -euo pipefail

MIGRATIONS_DIR="$(dirname "$0")/../supabase/migrations"

if [ -z "${SUPABASE_DB_URL:-}" ]; then
  echo "❌ SUPABASE_DB_URL is not set."
  echo ""
  echo "For a hosted Supabase project:"
  echo "  export SUPABASE_DB_URL='postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres'"
  echo ""
  echo "For local development with supabase CLI:"
  echo "  supabase start"
  echo "  export SUPABASE_DB_URL='postgresql://postgres:postgres@localhost:54322/postgres'"
  echo ""
  exit 1
fi

echo "🗄️  Running migrations against database..."
echo ""

for migration in "$MIGRATIONS_DIR"/*.sql; do
  filename=$(basename "$migration")
  echo "  → $filename"
  psql "$SUPABASE_DB_URL" -f "$migration" -v ON_ERROR_STOP=1 --quiet
done

echo ""
echo "✅ All migrations applied successfully."
echo ""
echo "Next steps:"
echo "  1. Copy .env.example to .env.local"
echo "  2. Fill in Supabase URL, anon key, and service role key"
echo "  3. Run: npm run dev"
