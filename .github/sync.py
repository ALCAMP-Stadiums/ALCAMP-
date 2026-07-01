#!/usr/bin/env python3
import urllib.request, json, base64, sys

TOKEN = ""  # set via env: LIVE_TOKEN
REPO  = "halzwbyta-alt/ALCAMP-"
FILE  = "index.html"

headers = {
    "Authorization": f"token {TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "Content-Type": "application/json"
}

print(f"🔄 Syncing {FILE} to live site...")

# Get current SHA
req = urllib.request.Request(f"https://api.github.com/repos/{REPO}/contents/{FILE}", headers=headers)
with urllib.request.urlopen(req) as r:
    sha = json.loads(r.read())["sha"]

# Read and encode local file
with open(FILE, "rb") as f:
    content = base64.b64encode(f.read()).decode()

# Update file
body = json.dumps({"message": "Auto sync from dev", "content": content, "sha": sha}).encode()
req2 = urllib.request.Request(
    f"https://api.github.com/repos/{REPO}/contents/{FILE}",
    data=body, headers=headers, method="PUT"
)
try:
    with urllib.request.urlopen(req2) as r:
        d = json.loads(r.read())
        print(f"✅ Synced! Commit: {d['commit']['sha'][:7]}")
except urllib.error.HTTPError as e:
    print(f"❌ Failed: {e.read().decode()}")
