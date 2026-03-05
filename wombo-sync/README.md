# 🎨 Wombo Sync

Auto-syncs Wombo Dream AI art from `/storage/emulated/0/Pictures/Dream/` to **Google Drive** → `Photos/Dream/` using `rclone` in Termux.

## Flow

```
/storage/emulated/0/Pictures/Dream/
    → MacroDroid triggers sync_wombo.sh
        → rclone copies new images to Google Drive
        → Script checks for files older than 80 days → 🔔 Warning
        → Script deletes files older than 90 days → 🗑️ Purge
```

## One-Time Setup

### 1. Install Termux & Dependencies

```bash
# In Termux
pkg upgrade -y && pkg install rclone termux-api -y
termux-setup-storage    # grant storage access
```

*Note: You must also install the **Termux:API** app from F-Droid to receive warnings.*

### 2. Configure rclone for Google Drive

```bash
rclone config
```

Follow the prompts:
- Name: **`gdrive`**
- Storage type: **Google Drive**
- Scope: **`drive`** (full access)
- When prompted, open the auth link — log in to your Google account

### 3. Deploy the script

```bash
mkdir -p ~/bin
cp sync_wombo.sh ~/bin/sync_wombo.sh
chmod +x ~/bin/sync_wombo.sh
```

### 4. Test manually

```bash
~/bin/sync_wombo.sh
```

### 5. Automate with MacroDroid

Create a macro in MacroDroid:
- **Trigger:** File Observer → Watch `/storage/emulated/0/Pictures/Dream/` for `New File Created`
- **Action:** Termux → Run `sync_wombo.sh`

## Files

| File | Purpose |
|------|---------|
| `sync_wombo.sh` | Syncs new Wombo images to Google Drive and purges old local files |

## Notes

- Uses `rclone copy` so images stay on your phone for 90 days.
- **Retention Policy**:
    - **Day 0-79**: File exists on Phone + Google Drive.
    - **Day 80-89**: Phone sends a "Purge Warning" notification.
    - **Day 90+**: File is automatically deleted from Phone (still on Google Drive).
- A log is written to `~/wombo-sync.log` for debugging.
- New images only — rclone skips files already on Drive.
