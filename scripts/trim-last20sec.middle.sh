#!/usr/bin/env bash
# Jump-cut middle: climax plays under the ending; head fades out over overlap (no dead air).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/public/assets/last20sec.original.mp3}"
OUT="${2:-$ROOT/public/assets/last20sec.mp3}"
OVERLAP="${OVERLAP_SEC:-3.5}"
TAIL_FADE_IN="${TAIL_FADE_IN_SEC:-1.2}"
START="${CUT_START:-61}"
END="${CUT_END:-173}"

if [[ ! -f "$SRC" ]]; then
  echo "Source not found: $SRC" >&2
  echo "Keep a backup as last20sec.original.mp3 or pass a path." >&2
  exit 1
fi

FADE_START=$(awk "BEGIN { print ${START} - ${OVERLAP} }")
DELAY_MS=$(awk "BEGIN { printf \"%.0f\", ${FADE_START} * 1000 }")

ffmpeg -y -vn -i "$SRC" -filter_complex "
[0:a]atrim=0:${START},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo:sample_fmts=fltp[ahead];
[ahead]afade=t=out:st=${FADE_START}:d=${OVERLAP}:curve=tri[head_fade];
[0:a]atrim=${END},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo:sample_fmts=fltp[atail];
[atail]afade=t=in:st=0:d=${TAIL_FADE_IN}:curve=tri[atail_in];
[atail_in]adelay=${DELAY_MS}|${DELAY_MS}[atail_d];
[head_fade][atail_d]amix=inputs=2:duration=longest:dropout_transition=0:normalize=0,alimiter=limit=0.98:level=disabled[out]
" -map "[out]" -c:a libmp3lame -q:a 2 "$OUT"

ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUT"
echo "Wrote $OUT (head fades ${FADE_START}s–${START}s while tail from ${END}s enters at ${FADE_START}s)"
