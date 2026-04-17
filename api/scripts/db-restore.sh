#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: bun run db:restore <backup_file>"
  echo ""
  echo "Available backups:"
  ls -1t "$(cd "$(dirname "$0")" && pwd)/../backups/"*.dump 2>/dev/null || echo "  No backups found"
  exit 1
fi

DB_CONTAINER="${DB_CONTAINER:-nearmerchcom-api-db-1}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-api}"
BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: File not found: $BACKUP_FILE"
  exit 1
fi

ABS_BACKUP_FILE="$(cd "$(dirname "$BACKUP_FILE")" && pwd)/$(basename "$BACKUP_FILE")"

echo "WARNING: This will DROP existing data and restore from backup."
echo "Container: $DB_CONTAINER"
echo "Database: $DB_NAME"
echo "Backup: $BACKUP_FILE"
echo ""
read -p "Continue? [y/N] " -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo "Dropping existing schema..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" \
  -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;" 2>/dev/null || true

echo "Copying backup into container..."
docker cp "$ABS_BACKUP_FILE" "$DB_CONTAINER:/tmp/restore.dump"

echo "Restoring from backup..."
docker exec "$DB_CONTAINER" pg_restore \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  /tmp/restore.dump

echo "Cleaning up..."
docker exec "$DB_CONTAINER" rm /tmp/restore.dump

echo ""
echo "Restore complete."
echo "Run 'cd api && bun run db:migrate' to re-apply drizzle migrations if needed."