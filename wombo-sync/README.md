# 🎨 Wombo Sync

Auto-syncs Wombo Dream AI art from your phone to a dedicated **Google Drive** folder (`My Drive/Wombo Art`) using `rclone` in Termux.

## Flow

```
Wombo generates art → saved to /sdcard/Pictures/WomboDream/
    → MacroDroid triggers sync_wombo.sh
        → rclone copies new images to Google Drive
            → Google Drive: "Wombo Art/" 📂
```

## One-Time Setup

### 1. Install Termux & rclone

```bash
# In Termux
pkg upgrade -y && pkg install rclone -y
termux-setup-storage    # grant storage access
```

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
- **Trigger:** File Observer → Watch `/sdcard/Pictures/WomboDream/` for `New File Created`
- **Action:** Termux → Run `sync_wombo.sh`

## Files

| File | Purpose |
|------|---------|
| `sync_wombo.sh` | Copies new Wombo images to Google Drive |

## Notes

- Uses `rclone copy` (not move) so originals stay on your phone
- A log is written to `~/wombo-sync.log` for debugging
- New images only — rclone skips files already on Drive
