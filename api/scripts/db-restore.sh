#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: bun run db:restore <backup_file>"
  echo ""
  echo "Available backups:"
  ls -1t "$(dirname "$0")/../backups/"*.dump 2>/dev/null || echo "  No backups found"
  exit 1
fi

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-api}"
BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File not found: $BACKUP_FILE"
  exit 1
fi

echo "WARNING: This will DROP existing tables and restore from backup."
echo "Target: postgres://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo "Backup: $BACKUP_FILE"
echo ""
read -p "Continue? [y/N] " -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Dropping existing tables..."
PGPASSWORD="${DB_PASSWORD:-postgres}" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null || true

echo "Restoring from backup..."
PGPASSWORD="${DB_PASSWORD:-postgres}" pg_restore \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  "$BACKUP_FILE"

echo ""
echo "Restore complete."
echo "Run 'bun run db:migrate' to re-apply drizzle migrations if needed."