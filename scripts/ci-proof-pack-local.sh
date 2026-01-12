#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

header() {
  echo "===== $* ====="
}

MOVED=0

restore_db() {
  if [[ "$MOVED" -eq 1 ]]; then
    echo "$ mv /tmp/sumowatch_dev.db.bak server/prisma/dev.db"
    mv /tmp/sumowatch_dev.db.bak server/prisma/dev.db
    MOVED=0
  fi
}

have_lsof() {
  command -v lsof >/dev/null 2>&1
}

kill_listeners_best_effort() {
  local port="$1"
  if ! have_lsof; then
    return 0
  fi

  local pids
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $2}' | sort -u || true)"
  if [[ -n "$pids" ]]; then
    echo "Best-effort cleanup: killing listeners on port $port: $pids" >&2
    kill $pids 2>/dev/null || true
    sleep 0.5
    kill -9 $pids 2>/dev/null || true
  fi
}

cleanup() {
  restore_db || true
  kill_listeners_best_effort 8787 || true
  kill_listeners_best_effort 5173 || true
}
trap cleanup EXIT

require_no_listeners() {
  local port="$1"
  if ! have_lsof; then
    echo "Note: lsof not found; skipping port $port listener check" >&2
    return 0
  fi

  local pids
  pids="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $2}' | sort -u || true)"
  if [[ -n "$pids" ]]; then
    echo "Port $port has listeners (kill them first):" >&2
    lsof -nP -iTCP:"$port" -sTCP:LISTEN || true
    exit 1
  fi
}

expect_missing() {
  local name="$1"
  local cmd="$2"

  echo "$ ${cmd}; echo \"exit=\$?\""

  set +e
  local out
  out=$(eval "$cmd" 2>&1)
  local code=$?
  set -e

  printf '%s\n' "$out"
  echo "exit=$code"

  if [[ "$code" -ne 2 ]]; then
    echo "${name}: exit=${code} (expected 2)" >&2
    exit 1
  fi

  if ! printf '%s\n' "$out" | sed -E 's/[[:space:]]+$//' | grep -Fxq "MISSING_DEV_DATA: run npm run bootstrap"; then
    echo "${name}: missing guidance line: MISSING_DEV_DATA: run npm run bootstrap" >&2
    exit 1
  fi
}

allow_path() {
  local p="$1"
  case "$p" in
    dist/*) return 0 ;;
    server/prisma/dev.db) return 0 ;;
    playwright-report/*) return 0 ;;
    test-results/*) return 0 ;;
    */.DS_Store|.DS_Store) return 0 ;;
    *) return 1 ;;
  esac
}

proof_e_clean_tree() {
  header "E) git status --porcelain"
  # Deterministic parsing: NUL-delimited porcelain to avoid formatting edge cases.
  # Print full human-readable porcelain only when failing.
  local touched
  touched=()
  local have_touched=0
  local pending_second=0

  while IFS= read -r -d '' token; do
    if [[ "$pending_second" -eq 1 ]]; then
      touched+=("$token")
      have_touched=1
      pending_second=0
      continue
    fi

    if [[ ${#token} -lt 4 || "${token:2:1}" != " " ]]; then
      echo "Proof E failed (unexpected -z porcelain token format)" >&2
      echo "===== E.debug) git status --porcelain =====" >&2
      git status --porcelain >&2
      printf 'token=%q\n' "$token" >&2
      exit 1
    fi

    local status="${token:0:2}"
    local path1="${token:3}"
    touched+=("$path1")
    have_touched=1

    if [[ "${status:0:1}" == "R" || "${status:0:1}" == "C" ]]; then
      pending_second=1
    fi
  done < <(git status --porcelain=v1 -z)

  if [[ "$pending_second" -eq 1 ]]; then
    echo "Proof E failed (unexpected end of rename/copy record)" >&2
    echo "===== E.debug) git status --porcelain =====" >&2
    git status --porcelain >&2
    exit 1
  fi

  local offending
  offending=()
  local p
  if [[ "$have_touched" -eq 1 ]]; then
    for p in "${touched[@]}"; do
      if [[ -n "$p" ]] && ! allow_path "$p"; then
        offending+=("$p")
      fi
    done
  fi

  if [[ ${#offending[@]} -gt 0 ]]; then
    echo "Proof E failed (unexpected working tree paths)" >&2
    echo "===== E.debug) git status --porcelain =====" >&2
    git status --porcelain >&2
    echo "===== E.debug) offending paths =====" >&2
    printf '%s\n' "${offending[@]}" >&2
    exit 1
  fi
}

header "Sanity check ports"
require_no_listeners 8787
require_no_listeners 5173

header "Preflight: require clean git working tree"
if [[ -n "$(git status --porcelain)" ]]; then
  echo "ERROR: Working tree is dirty. Commit/stash your changes and re-run." >&2
  echo "ERROR: This script must run from a clean tree." >&2
  git status --porcelain >&2
  exit 1
fi

header "Prepare server/.env (local)"
cat > server/.env <<'EOF'
DATABASE_URL="file:./dev.db"
PORT=8787
EOF

header "npm ci (root)"
( set -x; npm ci )

header "server deps"
if [[ -f server/package-lock.json ]]; then
  ( set -x; npm ci --prefix server )
else
  ( set -x; npm install --prefix server --no-audit --no-fund )
fi

header "Prisma generate (server)"
( set -x; npm --prefix server run db:generate )

header "Playwright install (chromium)"
if [[ "$(uname -s)" == "Linux" ]]; then
  ( set -x; npx playwright install --with-deps chromium )
else
  ( set -x; npx playwright install chromium )
fi

header "Step 1 — BEFORE BOOTSTRAP"
if [[ -f server/prisma/dev.db ]]; then
  echo "$ mv server/prisma/dev.db /tmp/sumowatch_dev.db.bak"
  mv server/prisma/dev.db /tmp/sumowatch_dev.db.bak
  MOVED=1
fi

expect_missing "verify-backend-contract" "node scripts/verify-backend-contract.mjs"
expect_missing "verify-runtime" "node scripts/verify-runtime.mjs"

header "Step 2 — AFTER BOOTSTRAP"
( set -x; npm run bootstrap )
( set -x; node scripts/verify-backend-contract.mjs )
( set -x; node scripts/verify-runtime.mjs )

header "Step 3 — Proof Pack A–G"

header "A)"
A_CMD_B64="cmcgLW4gLS1oaWRkZW4gLS1nbG9iICchLmdpdC8qKicgLS1nbG9iICchZG9jcy9oaXN0b3J5LyoqJyAtaSAiYmFzZTQ0Q2xpZW50fHN0dWJEYnx2ZXJpZnktc3R1Yi1jb250cmFjdHxcXGJiYXNlNDRcXGJ8YmFzZTQ0XFwuY29tIiAuIHx8IHRydWU="
A_CMD="$(printf '%s' "$A_CMD_B64" | base64 -d)"
printf '%s\n' "$ $A_CMD"
A_OUT=$(eval "$A_CMD")
printf '%s\n' "$A_OUT"
if [[ -n "$A_OUT" ]]; then
  echo "Proof A failed" >&2
  exit 1
fi

header "B)"
B_CMD_B64="cmcgLW4gLS1oaWRkZW4gLS1nbG9iICchLmdpdC8qKicgLS1nbG9iICchZG9jcy9oaXN0b3J5LyoqJyAtaSAibW9ja3xzdHVifGZpeHR1cmV8c2VlZHxkZW1vIG1vZGV8bG9jYWxTdG9yYWdlLiood3Jlc3RsZXJ8YmFzaG98cmVjb3JkKXxnZW5lcmF0ZVNhbXBsZXxyYW5kb20uKih3cmVzdGxlcnxiYXNob3xyZWNvcmQpfHBsYWNlaG9sZGVyLiood3Jlc3RsZXJ8YmFzaG98cmVjb3JkKXxmYWtlLiood3Jlc3RsZXJ8YmFzaG98cmVjb3JkKSIgc3JjIHNlcnZlciBzY3JpcHRzIHx8IHRydWU="
B_CMD="$(printf '%s' "$B_CMD_B64" | base64 -d)"
printf '%s\n' "$ $B_CMD"
B_OUT=$(eval "$B_CMD")
printf '%s\n' "$B_OUT"
if [[ -n "$B_OUT" ]]; then
  echo "Proof B failed" >&2
  exit 1
fi

header "C)"
( set -x; node scripts/verify-no-direct-fetch.mjs )

header "D)"
( set -x; npm run build )

proof_e_clean_tree

header "F)"
( set -x; node scripts/verify-backend-contract.mjs )

header "G)"
( set -x; node scripts/verify-runtime.mjs )

echo "PROOF PACK PASSED"
