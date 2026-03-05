# 📱 Macrodroid

A collection of Android automation scripts — powered by [Termux](https://termux.dev), [MacroDroid](https://www.macrodroid.com/), and various phone-side tools.

Each project lives in its own folder with its own README, setup instructions, and scripts.

---

## Projects

| Project | Description | Folder |
|---------|-------------|--------|
| 🚪 **Gate Automation** | Auto-open apartment gate via Gatewise when connecting to Wi-Fi | [`gate-automation/`](gate-automation/) |
| 🎬 **Media Downloader** | Download video/audio from shared URLs using yt-dlp in Termux | [`media-downloader/`](media-downloader/) |
| 🎨 **Wombo Sync** | Auto-sync Wombo Dream AI art to Google Drive via MacroDroid + rclone | [`wombo-sync/`](wombo-sync/) |
| 🧹 **Drive Org** | Maintain a clean "No Nonsense" Google Drive structure | [`drive-org/`](drive-org/) |

---

## Prerequisites

- **[Termux](https://f-droid.org/packages/com.termux/)** — Install from F-Droid *(not the Play Store)*
- **[MacroDroid](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid)** — Android automation engine

### First-Time Termux Setup

```bash
pkg upgrade -y
termux-setup-storage
```

---

## Repo Structure

```
macrodroid/
├── gate-automation/       # 🚪 Gatewise gate opener
│   ├── open_gate.sh
│   └── README.md
├── media-downloader/      # 🎬 yt-dlp share handler
│   ├── termux-url-opener
│   └── README.md
├── wombo-sync/            # 🎨 Wombo Dream → Google Drive
│   ├── sync_wombo.sh
│   └── README.md
├── drive-org/             # 🧹 Google Drive Organization
│   ├── organize_drive.sh
│   └── README.md
├── .github/workflows/     # CI/CD pipeline
│   └── ci.yml
├── .gitignore
└── README.md              # ← you are here
```

---

## CI/CD

Every push and PR runs a GitHub Actions pipeline that:
- ✅ Lints all shell scripts with [ShellCheck](https://www.shellcheck.net/)
