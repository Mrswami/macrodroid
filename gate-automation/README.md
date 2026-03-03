# 🚪 Gate Automation

Termux + MacroDroid scripts to auto-open the apartment gate at SYNC at Mueller via the Gatewise app.

## How It Works

1. **Trigger** — MacroDroid detects a Wi-Fi connection to the apartment network.
2. **Action** — MacroDroid fires a Termux command that launches the Gatewise app.
3. **Script** — `open_gate.sh` uses Android's `am start` to open the Gatewise main activity.

## Setup

1. Install [Termux](https://f-droid.org/packages/com.termux/) and [MacroDroid](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid).
2. Grant Termux the `Termux:Tasker` plugin permission.
3. Copy `open_gate.sh` to `~/.termux/tasker/` on your device:
   ```bash
   cp open_gate.sh ~/.termux/tasker/
   chmod +x ~/.termux/tasker/open_gate.sh
   ```
4. In MacroDroid, create a macro with:
   - **Trigger:** Wi-Fi Connected → your apartment SSID
   - **Action:** Termux → `open_gate.sh`

## Files

| File | Purpose |
|------|---------|
| `open_gate.sh` | Launches the Gatewise Android app |
