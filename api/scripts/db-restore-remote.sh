#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-${API_DATABASE_URL:-}}"

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL or API_DATABASE_URL must be set"
  echo ""
  echo "Usage: DATABASE_URL=\"postgres://user:pass@host:5432/db\" bun run db:restore:remote <backup_file>"
  exit 1
fi

if [ $# -lt 1 ]; then
  echo "Usage: DATABASE_URL=\"postgres://user:pass@host:5432/db\" bun run db:restore:remote <backup_file>"
  echo ""
  echo "Available backups:"
  ls -1t "$(cd "$(dirname "$0")" && pwd)/../backups/"*.dump 2>/dev/null || echo "  No backups found"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File not found: $BACKUP_FILE"
  exit 1
fi

ABS_BACKUP_FILE="$(cd "$(dirname "$BACKUP_FILE")" && pwd)/$(basename "$BACKUP_FILE")"

echo "WARNING: This will DROP existing data and restore from backup."
echo "URL: ${DATABASE_URL//:\/\/.*@/:\/\/***@}"
echo "Backup: $BACKUP_FILE"
echo ""
read -p "Continue? [y/N] " -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Dropping existing schema..."
psql "$DATABASE_URL" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null || true

echo "Restoring from backup..."
pg_restore \
  "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  < "$ABS_BACKUP_FILE"

echo ""
echo "Restore complete."
echo "Run 'cd api && bun run db:migrate' to re-apply drizzle migrations if needed."