#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/public/assets/debutant-singing-recital.mp4"

if [[ -n "${1:-}" ]]; then
  SRC="$1"
else
  SRC="$ROOT/public/assets/FDownloader.net-1621532585052156-(1080p).mp4"
fi

if [[ ! -f "$SRC" ]]; then
  for dir in "$ROOT/public/assets" "$ROOT/public/assets/incoming" "$ROOT" "$HOME/Downloads" "$HOME/Documents" "$HOME/Desktop"; do
    found="$(find "$dir" -maxdepth 2 -name '*1621532585052156*' -print -quit 2>/dev/null || true)"
    if [[ -n "$found" && -f "$found" ]]; then
      SRC="$found"
      break
    fi
  done
fi

if [[ ! -f "$SRC" ]]; then
  echo "Source video not found: $SRC" >&2
  echo "Copy FDownloader.net-1621532585052156-(1080p).mp4 into public/assets/ (or incoming/), or run:" >&2
  echo "Usage: $0 [/path/to/source.mp4]" >&2
  exit 1
fi

echo "Using source: $SRC"

# BCHSA recital clip: 3:00 through 3:40 (40 seconds).
ffmpeg -y -ss 00:03:00 -to 00:03:40 -i "$SRC" \
  -c:v libx264 -crf 20 -preset fast \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  "$OUT"

ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT"
echo "Wrote $OUT"
echo ""
echo "Next: in src/App.tsx on the BCHSA DebutantMoment, add:"
echo '  video="/assets/debutant-singing-recital.mp4"'
echo "  videoSound"
echo "And add \"/assets/debutant-singing-recital.mp4\" to INVITATION_MOMENT_VIDEO_URLS in src/constants/momentVideos.ts"
