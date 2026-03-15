#!/bin/bash
# One-time setup: copy backup script to VPS and add cron job (2 AM daily).
# Run from project root: ./scripts/setup-backup-cron.sh
# Requires: ssh root@187.124.225.101 to work.

set -e
cd "$(dirname "$0")/.."
VPS="root@187.124.225.101"
REMOTE_BACKUP_SCRIPT="/usr/local/bin/sarasota-backup-mongodb.sh"
BACKUP_SCRIPT="scripts/backup-mongodb-vps.sh"
CRON_ENTRY="0 2 * * * $REMOTE_BACKUP_SCRIPT >> /var/log/sarasota-backup.log 2>&1"

echo "Copying backup script to VPS..."
scp -o StrictHostKeyChecking=accept-new "$BACKUP_SCRIPT" "$VPS:$REMOTE_BACKUP_SCRIPT"
ssh -o StrictHostKeyChecking=accept-new "$VPS" "chmod +x $REMOTE_BACKUP_SCRIPT"

echo "Adding cron job (2 AM daily)..."
ssh "$VPS" "(crontab -l 2>/dev/null | grep -v sarasota-backup-mongodb; echo '$CRON_ENTRY') | crontab -"
echo "Current crontab:"
ssh "$VPS" "crontab -l"
echo ""
echo "Done. Backups will run at 2 AM and go to /var/backups/sarasota-automotive/db/"
echo "Log: /var/log/sarasota-backup.log"
