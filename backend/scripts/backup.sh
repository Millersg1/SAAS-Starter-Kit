#!/bin/bash
# Database backup script for SAAS Surface
# Usage: ./scripts/backup.sh
# Cron example (daily at 2am): 0 2 * * * /path/to/backend/scripts/backup.sh
#
# Set these in your environment or .env:
#   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
#   BACKUP_DIR (optional, defaults to ./backups)
#   BACKUP_RETENTION_DAYS (optional, defaults to 30)

set -euo pipefail

# Load .env if present
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  set -a
  source "$ENV_FILE"
  set +a
fi

# Config
BACKUP_DIR="${BACKUP_DIR:-$SCRIPT_DIR/../backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FILENAME="saassurface_${TIMESTAMP}.sql.gz"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting database backup..."

# Run pg_dump with compression
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "${DB_HOST:-localhost}" \
  -p "${DB_PORT:-5432}" \
  -U "${DB_USER:-postgres}" \
  -d "$DB_NAME" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  | gzip > "$BACKUP_DIR/$FILENAME"

SIZE=$(du -h "$BACKUP_DIR/$FILENAME" | cut -f1)
echo "[$(date)] Backup created: $FILENAME ($SIZE)"

# Clean up old backups
DELETED=$(find "$BACKUP_DIR" -name "saassurface_*.sql.gz" -mtime +$RETENTION_DAYS -delete -print | wc -l)
if [ "$DELETED" -gt 0 ]; then
  echo "[$(date)] Cleaned up $DELETED backup(s) older than $RETENTION_DAYS days"
fi

echo "[$(date)] Backup complete. Retention: $RETENTION_DAYS days"
