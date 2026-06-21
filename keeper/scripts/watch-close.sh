#!/usr/bin/env bash
# Poll Predict until oracle settles, then run vault:close.
set -euo pipefail

ORACLE_ID="${1:?oracle id required}"
POLL_SECS="${2:-120}"
PREDICT_SERVER="${PREDICT_SERVER:-https://predict-server.testnet.mystenlabs.com}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"

echo "[watch-close] oracle=$ORACLE_ID poll=${POLL_SECS}s"

while true; do
  listing="$(curl -sf "${PREDICT_SERVER}/oracles" | python3 -c "
import json, sys
oid = sys.argv[1]
for o in json.load(sys.stdin):
    if o.get('oracle_id') == oid:
        print(o.get('status','unknown'))
        break
else:
    print('missing')
" "$ORACLE_ID")"

  now="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "[watch-close] $now status=$listing"

  if [[ "$listing" == "settled" ]]; then
    echo "[watch-close] settled — running vault:close"
    cd "$ROOT/keeper"
    npm run vault:close
    echo "[watch-close] done"
    exit 0
  fi

  sleep "$POLL_SECS"
done
