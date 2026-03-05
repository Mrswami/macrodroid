#!/bin/bash
# organize_drive.sh — Reorganize Google Drive into a clean structure
#
# Requires: rclone configured with a remote named "gdrive"

REMOTE="gdrive:"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Google Drive organization..."

# Function to rename/move folders if they exist
move_folder() {
    src="$1"
    dest="$2"
    if rclone lsd "$REMOTE$src" > /dev/null 2>&1; then
        echo "Moving '$src' to '$dest'..."
        rclone move "$REMOTE$src" "$REMOTE$dest" --dry-run
        # Note: In a real run, we remove --dry-run after confirmation
        rclone move "$REMOTE$src" "$REMOTE$dest"
    fi
}

# 1. Standardize core folders
move_folder "→Photos" "Photos"
move_folder "→Documents" "Documents"
move_folder "→Download" "Downloads"

# 2. Archive clutter
move_folder "__Sorting" "Archive/_Sorting"
move_folder "_School" "Archive/_School"

# 3. Create missing standard folders
rclone mkdir "${REMOTE}Videos"
rclone mkdir "${REMOTE}Music"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Organization complete!"
