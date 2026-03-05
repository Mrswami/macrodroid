#!/bin/bash
# sync_wombo.sh — Sync Wombo Dream AI art to Google Drive
#
# Requires: rclone configured with a remote named "gdrive"
#   Run `rclone config` in Termux first to set this up.
#
# Google Drive destination folder: "My Drive/Wombo Art"

WOMBO_LOCAL="$HOME/storage/pictures/WomboDream"
GDRIVE_DEST="gdrive:Wombo Art"
LOG_FILE="$HOME/wombo-sync.log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Wombo sync..." | tee -a "$LOG_FILE"

# Check that the source directory exists
if [ ! -d "$WOMBO_LOCAL" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Wombo folder not found at $WOMBO_LOCAL" | tee -a "$LOG_FILE"
    exit 1
fi

# Count new files before sync
NEW_COUNT=$(rclone copy --dry-run "$WOMBO_LOCAL" "$GDRIVE_DEST" 2>&1 | grep -c "Copied")

# Copy (not move) so originals stay on phone until you decide to delete
rclone copy \
    --transfers 4 \
    --checkcopy-workers 4 \
    --log-file "$LOG_FILE" \
    --log-level INFO \
    "$WOMBO_LOCAL" "$GDRIVE_DEST"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Sync complete. ~$NEW_COUNT new file(s) uploaded." | tee -a "$LOG_FILE"
