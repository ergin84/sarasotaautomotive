#!/bin/bash
# MongoDB backup for Sarasota Automotive. Run on the VPS (e.g. via cron at 2 AM).
# Backups go to /var/backups/sarasota-automotive/db/ ; keeps only the latest 7 backups.

set -e
MONGO_DB="${MONGO_DB:-sarasota_automotive}"
BACKUP_ROOT="/var/backups/sarasota-automotive/db"
KEEP_N=7
DATE=$(date +%Y-%m-%d_%H%M%S)
BACKUP_DIR="$BACKUP_ROOT/$DATE"
ARCHIVE="$BACKUP_ROOT/sarasota_automotive_$DATE.gz"

mkdir -p "$BACKUP_ROOT"

# mongodump to directory then gzip (works with mongodump 4.4+ and mongosh-era MongoDB)
if command -v mongodump >/dev/null 2>&1; then
  mongodump --db="$MONGO_DB" --out="$BACKUP_DIR" --quiet 2>/dev/null || mongodump --db="$MONGO_DB" --out="$BACKUP_DIR"
  tar -czf "$ARCHIVE" -C "$BACKUP_ROOT" "$DATE"
  rm -rf "$BACKUP_DIR"
  echo "$(date -Iseconds) Backup done: $ARCHIVE"
else
  echo "$(date -Iseconds) ERROR: mongodump not found" >&2
  exit 1
fi

# Keep only the latest KEEP_N backups (delete older ones by count)
ls -t "$BACKUP_ROOT"/sarasota_automotive_*.gz 2>/dev/null | tail -n +$((KEEP_N + 1)) | xargs -r rm -- || true
