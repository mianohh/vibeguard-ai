#!/bin/bash
# deploy-enclave.sh — Build on AWS and restart the enclave
set -e

AWS_HOST="98.82.186.207"
AWS_USER="ec2-user"
KEY="$HOME/.ssh/vibeguard-key.pem"
SSH="ssh -i $KEY -o StrictHostKeyChecking=no"
SCP="scp -i $KEY -o StrictHostKeyChecking=no"
REMOTE="$AWS_USER@$AWS_HOST"
REMOTE_DIR="~/nautilus-server"
BINARY="$REMOTE_DIR/target/release/nautilus-server"

echo "═══════════════════════════════════════════════════════"
echo " VibeGuard Enclave Deploy — AWS $AWS_HOST"
echo "═══════════════════════════════════════════════════════"

# ── Step 1: Sync source files to AWS ────────────────────────────────────────
echo "STEP 1 — Syncing source to AWS..."
$SCP src/nautilus-server/Cargo.toml "$REMOTE:$REMOTE_DIR/Cargo.toml"
$SCP src/nautilus-server/src/apps/vibeguard/mod.rs "$REMOTE:$REMOTE_DIR/src/apps/vibeguard/mod.rs"
$SCP src/nautilus-server/src/apps/vibeguard/threat_agent.rs "$REMOTE:$REMOTE_DIR/src/apps/vibeguard/threat_agent.rs"
echo "✅ Source synced"

# ── Step 2: Build on AWS ─────────────────────────────────────────────────────
echo "STEP 2 — Building on AWS (this takes ~2-3 min)..."
$SSH "$REMOTE" "cd $REMOTE_DIR && cargo build --release 2>&1 | tail -5"
echo "✅ Build complete"

# ── Step 3: Restart enclave ──────────────────────────────────────────────────
echo "STEP 3 — Restarting enclave..."
$SSH "$REMOTE" "
  pkill -9 nautilus-server 2>/dev/null || true
  pkill -9 socat 2>/dev/null || true
  sleep 2
  nohup $BINARY > $REMOTE_DIR/enclave.log 2>&1 &
  sleep 4
  curl -s http://localhost:3000/health_check
"
echo "✅ Enclave restarted"

# ── Step 4: Smoke test new sign_report API ───────────────────────────────────
echo "STEP 4 — Testing /sign_report (Walrus upload inside enclave)..."
RESULT=$(curl -s -X POST "http://$AWS_HOST:3000/sign_report" \
  -H "Content-Type: application/json" \
  -d '{"malicious_package_id":"0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef","reasons":["DEPLOY_TEST"],"reporter":"0x0000000000000000000000000000000000000000000000000000000000000001"}')

echo "$RESULT" | python3 -m json.tool 2>/dev/null || echo "$RESULT"

if echo "$RESULT" | grep -q '"blob_id"'; then
  echo "✅ sign_report working — Walrus upload + signing confirmed"
else
  echo "❌ sign_report test failed"
  exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo " Deployment complete. Enclave at http://$AWS_HOST:3000"
echo "═══════════════════════════════════════════════════════"
