#!/usr/bin/env bash
set -euo pipefail

DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5433}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${DB_NAME:-api}"
BACKUP_DIR="$(dirname "$0")/../backups"

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pre_migration_${TIMESTAMP}.dump"

echo "Backing up postgres://${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}..."
echo "Output: $BACKUP_FILE"

PGPASSWORD="${DB_PASSWORD:-postgres}" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
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
echo "  bun run db:restore $BACKUP_FILE"