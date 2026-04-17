#!/usr/bin/env bash
set -euo pipefail

DATABASE_URL="${DATABASE_URL:-${API_DATABASE_URL:-}}"

if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL or API_DATABASE_URL must be set"
  echo ""
  echo "Usage: DATABASE_URL=\"postgres://user:pass@host:5432/db\" bun run db:backup:remote"
  echo ""
  echo "For Railway Postgres, you can find the connection string in:"
  echo "  Railway Dashboard > Your service > Variables > DATABASE_URL"
  exit 1
fi

BACKUP_DIR="$(cd "$(dirname "$0")" && pwd)/../backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pre_migration_${TIMESTAMP}.dump"

echo "Backing up remote database..."
echo "URL: ${DATABASE_URL//:\/\/.*@/:\/\/***@}"
echo "Output: $BACKUP_FILE"
echo ""

pg_dump \
  "$DATABASE_URL" \
  -Fc \
  --no-owner \
  --no-privileges \
  > "$BACKUP_FILE"

SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo ""
echo "Backup complete: $SIZE"
echo "File: $BACKUP_FILE"
echo ""
echo "To restore later, run:"
echo "  DATABASE_URL=\"$DATABASE_URL\" bun run db:restore:remote $BACKUP_FILE"