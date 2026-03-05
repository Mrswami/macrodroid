#!/bin/bash
# sync_wombo.sh — Sync Wombo Dream AI art to Google Drive with 90-day phone retention
#
# Requires: 
#   1. rclone configured with a remote named "gdrive"
#   2. termux-api package installed (`pkg install termux-api`)
#   3. Termux:API app installed on Android
#
# Path: /storage/emulated/0/Pictures/Dream
# Google Drive destination: Photos/Dream

WOMBO_LOCAL="/storage/emulated/0/Pictures/Dream"
GDRIVE_DEST="gdrive:→Photos/Dream"
LOG_FILE="$HOME/wombo-sync.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Wombo sync..." | tee -a "$LOG_FILE"

# 1. Check source directory
if [ ! -d "$WOMBO_LOCAL" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Dream folder not found at $WOMBO_LOCAL" | tee -a "$LOG_FILE"
    exit 1
fi

# 2. Sync to Google Drive (Copy, not Move)
rclone copy \
    --transfers 4 \
    --checkcopy-workers 4 \
    --log-file "$LOG_FILE" \
    --log-level INFO \
    "$WOMBO_LOCAL" "$GDRIVE_DEST"

# 3. Retention Policy Logic
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking retention policy..." | tee -a "$LOG_FILE"

# Find files older than 80 days for warning
WARN_FILES=$(find "$WOMBO_LOCAL" -type f -mtime +80 -mtime -90 | wc -l)
if [ "$WARN_FILES" -gt 0 ]; then
    MSG="⚠️ $WARN_FILES Wombo art files are older than 80 days and will be purged soon (90-day limit)."
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $MSG" | tee -a "$LOG_FILE"
    # Send a notification if termux-notification is available
    if command -v termux-notification > /dev/null; then
        termux-notification --title "Wombo Purge Warning" --content "$MSG" --priority high
    fi
fi

# Find and Delete files older than 90 days
PURGE_FILES=$(find "$WOMBO_LOCAL" -type f -mtime +90)
PURGE_COUNT=$(echo "$PURGE_FILES" | grep -v "^$" | wc -l)

if [ "$PURGE_COUNT" -gt 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] PURGING: Deleting $PURGE_COUNT files older than 90 days..." | tee -a "$LOG_FILE"
    echo "$PURGE_FILES" | xargs rm -f
    
    if command -v termux-notification > /dev/null; then
        termux-notification --title "Wombo Cleanup Complete" --content "Deleted $PURGE_COUNT files older than 90 days (backed up to Drive)." --priority low
    fi
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sync and retention check complete." | tee -a "$LOG_FILE"
