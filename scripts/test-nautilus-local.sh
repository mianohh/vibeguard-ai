#!/bin/bash
# test-nautilus-local.sh — Build and smoke-test the nautilus-server locally.
# Verifies: keypair load, PCR computation, server boot, /health_check shape.
set -e

cd "$(dirname "$0")/../src/nautilus-server"

KEYPAIR_FILE="$(mktemp /tmp/vibeguard-keypair-XXXXXX.json)"
trap 'rm -f "$KEYPAIR_FILE"' EXIT

# Deterministic test seed (NOT for production)
cat > "$KEYPAIR_FILE" <<'EOF'
{ "seed_hex": "1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f1f" }
EOF

echo "▶ Building nautilus-server (release)..."
cargo build --release 2>&1 | tail -2

echo "▶ Starting server..."
KEYPAIR_PATH="$KEYPAIR_FILE" VIBEGUARD_TEE_MODE=simulation ./target/release/nautilus-server &
SERVER_PID=$!
trap 'kill $SERVER_PID 2>/dev/null || true; rm -f "$KEYPAIR_FILE"' EXIT

# Wait for port
for i in $(seq 1 40); do
  if curl -sf http://localhost:3000/health_check > /dev/null 2>&1; then break; fi
  sleep 0.5
done

echo "▶ GET /health_check"
HEALTH=$(curl -sf http://localhost:3000/health_check)
echo "$HEALTH"

echo "$HEALTH" | python3 -c '
import json, sys
h = json.load(sys.stdin)
assert h["status"] == "healthy", h
assert len(h["public_key"]) == 64, h
print("health_check OK")
'

echo "▶ GET /get_attestation"
ATTEST=$(curl -sf http://localhost:3000/get_attestation)
echo "$ATTEST"

echo "$ATTEST" | python3 -c '
import json, sys
a = json.load(sys.stdin)
assert len(a["pcr0"]) == 96, a
assert a["provider"] == "simulation", a
assert a["mode"] == "simulation", a
print("get_attestation OK (provider=simulation)")
'

echo "▶ POST /sign_report"
SIGN=$(curl -sf --max-time 15 -X POST http://localhost:3000/sign_report \
  -H "Content-Type: application/json" \
  -d '{"malicious_package_id":"0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef","reasons":["SMOKE_TEST"],"reporter":"0x0000000000000000000000000000000000000000000000000000000000000001"}' || true)
echo "$SIGN"
if echo "$SIGN" | grep -q '"blob_id"'; then
  echo "sign_report OK"
else
  echo "⚠ sign_report returned no blob_id (Walrus may be unreachable) — not failing smoke test"
fi

echo ""
echo "✅ nautilus-server smoke test passed"
