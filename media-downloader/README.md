# 🎬 Media Downloader

A Termux-based media downloader that hooks into Android's share menu. Share a YouTube (or other supported) URL and choose to download the **video** or extract **audio as MP3**.

## Dependencies

```bash
pkg upgrade -y && pkg install python ffmpeg -y && pip install yt-dlp
```

## Setup

1. Ensure Termux storage access is configured:
   ```bash
   termux-setup-storage
   ```
2. Copy the script to Termux's URL handler location:
   ```bash
   mkdir -p ~/bin
   cp termux-url-opener ~/bin/termux-url-opener
   chmod +x ~/bin/termux-url-opener
   ```
3. Share any supported URL to Termux from any Android app — it will prompt you to choose video or audio.

## Output

All downloads are saved to `~/storage/downloads/`.

## Files

| File | Purpose |
|------|---------|
| `termux-url-opener` | Main share-handler script |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `CANNOT LINK EXECUTABLE` | Run `pkg upgrade -y && pkg install python ffmpeg -y` |
| `yt-dlp: command not found` | Run `pip install yt-dlp` |
| Files not appearing in Downloads | Run `termux-setup-storage` |
