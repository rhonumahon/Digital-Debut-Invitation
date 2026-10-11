#!/usr/bin/env bash
# Local hero/countdown test — grand entry ~90s after dev server starts (+08:00).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="$(python3 - <<'PY'
from datetime import datetime, timedelta, timezone
ph = timezone(timedelta(hours=8))
t = datetime.now(ph) + timedelta(seconds=120)
print(t.strftime("%Y-%m-%dT%H:%M:%S+08:00"))
PY
)"
export VITE_GRAND_ENTRY_AT="$TARGET"
echo "Local grand entry at $TARGET (~2 min). Hero shows MM:SS then last-10s digits, then gown wipe at zero."
exec npm run dev -- --port=3000 --host=0.0.0.0
