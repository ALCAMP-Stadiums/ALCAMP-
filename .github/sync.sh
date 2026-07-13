#!/bin/bash
# Auto-sync index.html to halzwbyta-alt/ALCAMP- after each push
TOKEN="${LIVE_TOKEN:-}"  # set via env: LIVE_TOKEN
REPO="halzwbyta-alt/ALCAMP-"
FILE="index.html"

echo "🔄 Syncing $FILE to live site..."

SHA=$(curl -s -H "Authorization: token $TOKEN" \
  "https://api.github.com/repos/$REPO/contents/$FILE" | \
  python3 -c "import json,sys; print(json.load(sys.stdin)['sha'])")

CONTENT=$(base64 -w 0 "$FILE")

RESULT=$(curl -s -X PUT \
  -H "Authorization: token $TOKEN" \
  -H "Content-Type: application/json" \
  "https://api.github.com/repos/$REPO/contents/$FILE" \
  -d "{\"message\":\"Auto sync from dev\",\"content\":\"$CONTENT\",\"sha\":\"$SHA\"}")

echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print('✅ Synced!' if 'commit' in d else '❌ Failed: '+str(d.get('message','unknown')))"
