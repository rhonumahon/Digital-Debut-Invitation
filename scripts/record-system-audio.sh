#!/usr/bin/env bash
# Record what plays on this Mac (YouTube, Spotify, etc.) — not the room mic.
# Requires a loopback device (BlackHole). See: scripts/record-system-audio.sh setup
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CAPTURE_DIR="${SYSTEM_AUDIO_CAPTURE_DIR:-$ROOT/local-captures}"
DEVICE="${SYSTEM_AUDIO_INPUT:-BlackHole 2ch}"

usage() {
  cat <<'EOF'
Record machine audio (loopback), not the microphone.

One-time macOS setup:
  1. Install loopback driver:
       brew install blackhole-2ch
     (Reboot or log out/in if the device does not appear.)
  2. Open "Audio MIDI Setup" → "+" → "Create Multi-Output Device".
     Check: your speakers/headphones AND "BlackHole 2ch".
     Optional: rename to "Speakers + BlackHole".
  3. System Settings → Sound → Output → pick that Multi-Output Device.
     You still hear audio; ffmpeg records the same digital stream.

Commands:
  ./scripts/record-system-audio.sh setup
  ./scripts/record-system-audio.sh list
  ./scripts/record-system-audio.sh capture -d SECONDS [-o path.wav] [--mp3]

Environment:
  SYSTEM_AUDIO_INPUT     avfoundation device name (default: BlackHole 2ch)
  SYSTEM_AUDIO_CAPTURE_DIR  output folder (default: ./local-captures)

After capture, trim or convert for the site, e.g.:
  ffmpeg -i local-captures/foo.wav -t 216 -q:a 2 public/assets/intro.mp3

Only use audio you have rights to host on the public invitation site.
EOF
}

print_setup() {
  usage
  echo ""
  echo "Checking for loopback device..."
  if ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -qi blackhole; then
    echo "  BlackHole appears in ffmpeg device list."
  else
    echo "  BlackHole not listed yet — install blackhole-2ch and set Multi-Output (see above)."
  fi
}

list_devices() {
  echo "AVFoundation devices (use SYSTEM_AUDIO_INPUT with the exact name):"
  ffmpeg -f avfoundation -list_devices true -i "" 2>&1 \
    | sed -n '/AVFoundation audio devices:/,$p' \
    | grep -v 'Error opening input' || true
}

run_capture() {
  local duration="" out="" make_mp3=0
  while [[ $# -gt 0 ]]; do
    case "$1" in
      -d|--duration) duration="$2"; shift 2 ;;
      -o|--output) out="$2"; shift 2 ;;
      --mp3) make_mp3=1; shift ;;
      *) echo "Unknown option: $1" >&2; usage >&2; exit 1 ;;
    esac
  done

  if [[ -z "$duration" ]]; then
    echo "Missing -d SECONDS (e.g. -d 216 for 3:36)" >&2
    exit 1
  fi

  mkdir -p "$CAPTURE_DIR"
  if [[ -z "$out" ]]; then
    out="$CAPTURE_DIR/capture-$(date +%Y%m%d-%H%M%S).wav"
  fi

  if ! ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -F "$DEVICE" >/dev/null 2>&1; then
    if ! ffmpeg -f avfoundation -list_devices true -i "" 2>&1 | grep -qi blackhole; then
      echo "Loopback device not found. Run: $0 setup" >&2
      exit 1
    fi
    echo "Note: using device name \"$DEVICE\" — run \"$0 list\" if capture fails." >&2
  fi

  echo "Recording ${duration}s from \"$DEVICE\" (start playback now)..."
  echo "Output: $out"
  # No video input (:), audio-only from named device.
  ffmpeg -y -f avfoundation -i ":$DEVICE" -t "$duration" -ac 2 -c:a pcm_s16le "$out"

  if [[ "$make_mp3" -eq 1 ]]; then
    local mp3="${out%.wav}.mp3"
    ffmpeg -y -i "$out" -codec:a libmp3lame -q:a 2 "$mp3"
    echo "Wrote $mp3"
  fi

  echo "Done. Wrote $out"
}

cmd="${1:-}"
shift || true
case "$cmd" in
  setup) print_setup ;;
  list|devices) list_devices ;;
  capture) run_capture "$@" ;;
  ""|-h|--help|help) usage ;;
  *)
    echo "Unknown command: $cmd" >&2
    usage >&2
    exit 1
    ;;
esac
