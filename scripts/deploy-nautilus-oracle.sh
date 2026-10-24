#!/bin/bash
# deploy-nautilus-oracle.sh — Deploy nautilus-server to Oracle Cloud Always Free.
#
# Always Free limits: up to 4x VM.Standard.A1.Flex (Ampere ARM, max 4 OCPU /
# 24 GB total) or VM.Standard.E2.1.Micro. This script provisions a 2 OCPU /
# 12 GB A1 instance (plenty for nautilus-server) and deploys to it.
#
# Modes:
#   1) Provision + deploy (requires OCI CLI configured, `oci` on PATH):
#        OCI_COMPARTMENT_ID=ocid1.compartment... \
#        OCI_SSH_PUBLIC_KEY=~/.ssh/id_ed25519.pub \
#        ./scripts/deploy-nautilus-oracle.sh
#
#   2) Deploy to an existing instance (skip provisioning):
#        ORACLE_HOST=<ip> ORACLE_SSH_KEY=~/.ssh/id_ed25519 \
#        ./scripts/deploy-nautilus-oracle.sh
#
# Optional env:
#   ORACLE_REGION       (default: us-ashburn-1)
#   ORACLE_ADS          (default: first AD in region)
#   ORACLE_SHAPE_OCPU   (default: 2)
#   ORACLE_SHAPE_MEM    (default: 12)
#   ORACLE_INSTANCE_NAME (default: vibeguard-nautilus)
#   ORACLE_SSH_USER     (default: ubuntu)
#
# Note on Always Free reclamation: Oracle may reclaim idle Always Free
# compute (avg CPU < ~20% over7 days). This script installs a keep-warm
# systemd timer that curls /health_check every 20 minutes to prevent that.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REGION="${ORACLE_REGION:-us-ashburn-1}"
SHAPE="VM.Standard.A1.Flex"
OCPUS="${ORACLE_SHAPE_OCPU:-2}"
MEM_GB="${ORACLE_SHAPE_MEM:-12}"
INSTANCE_NAME="${ORACLE_INSTANCE_NAME:-vibeguard-nautilus}"
SSH_USER="${ORACLE_SSH_USER:-ubuntu}"
REMOTE_DIR="/opt/vibeguard/nautilus-server"
LOCAL_KEY="${ORACLE_SSH_KEY:-$HOME/.ssh/id_ed25519}"

SSH_OPTS=(-i "$LOCAL_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=10 -o BatchMode=yes)
SCP_OPTS=(-i "$LOCAL_KEY" -o StrictHostKeyChecking=no)

log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m❌ %s\033[0m\n' "$*" >&2; exit 1; }

# ── Mode selection ───────────────────────────────────────────────────────────
if [ -z "${ORACLE_HOST:-}" ]; then
  # Provisioning mode
  CID="${OCI_COMPARTMENT_ID:?Set OCI_COMPARTMENT_ID to your compartment OCID}"
  PUBKEY_FILE="${OCI_SSH_PUBLIC_KEY:-$LOCAL_KEY.pub}"
  [ -f "$PUBKEY_FILE" ] || die "SSH public key not found: $PUBKEY_FILE"
  command -v oci >/dev/null || die "OCI CLI not found — install it or set ORACLE_HOST to deploy to an existing instance"

  log "Provisioning Oracle Cloud A1 instance in $REGION"

  AD_NAME=$(oci iam availability-domain list \
    --compartment-id "$CID" --region "$REGION" \
    --query 'data[0].name' --raw-output)

  IMAGE_ID=$(oci compute image list \
    --compartment-id "$CID" --region "$REGION" \
    --operating-system "Canonical Ubuntu" \
    --operating-system-version "22.04" \
    --shape "$SHAPE" \
    --sort-by TIMECREATED --sort-order DESC \
    --query 'data[0]."id"' --raw-output)
  [ -n "$IMAGE_ID" ] && [ "$IMAGE_ID" != "null" ] || die "No Ubuntu22.04 ARM image found"

  # VCN / subnet / internet gateway — find-or-create (idempotent).
  # NOTE (verified 2026-10-23 against af-johannesburg-1): BOTH create AND list
  # responses expose `id`. List items carry `vcn-id` only as the PARENT link.
  # Querying data[0]."vcn-id" returns null → "no VCN found" → duplicate VCNs
  # until the vcn-count limit (2) aborts the run.
  VCN_ID=$(oci network vcn list --compartment-id "$CID" --region "$REGION" \
    --query 'data[0]."id"' --raw-output 2>/dev/null || true)
  if [ -z "$VCN_ID" ] || [ "$VCN_ID" = "null" ]; then
    log "No VCN found — creating vibeguard-vcn (10.0.0.0/16)"
    VCN_ID=$(oci network vcn create --compartment-id "$CID" --region "$REGION" \
      --cidr-blocks '["10.0.0.0/16"]' --dns-label vibeguard \
      --query 'data."id"' --raw-output)
  fi

  SUBNET_ID=$(oci network subnet list --compartment-id "$CID" --region "$REGION" \
    --vcn-id "$VCN_ID" --query 'data[0]."id"' --raw-output 2>/dev/null || true)
  if [ -z "$SUBNET_ID" ] || [ "$SUBNET_ID" = "null" ]; then
    log "Creating subnet 10.0.0.0/24"
    SUBNET_ID=$(oci network subnet create --compartment-id "$CID" --region "$REGION" \
      --vcn-id "$VCN_ID" --cidr-block "10.0.0.0/24" --dns-label sn0 \
      --prohibit-public-ip-on-vnic false \
      --query 'data."id"' --raw-output)
  fi

  INTERNET_GATEWAY_ID=$(oci network internet-gateway list \
    --compartment-id "$CID" --region "$REGION" \
    --vcn-id "$VCN_ID" --query 'data[0]."id"' --raw-output 2>/dev/null || true)
  if [ -z "$INTERNET_GATEWAY_ID" ] || [ "$INTERNET_GATEWAY_ID" = "null" ]; then
    log "Creating internet gateway"
    INTERNET_GATEWAY_ID=$(oci network internet-gateway create \
      --compartment-id "$CID" --region "$REGION" --vcn-id "$VCN_ID" \
      --is-enabled true \
      --query 'data."id"' --raw-output)
  fi

  oci network route-table update \
    --rt-id "$(oci network route-table list --compartment-id "$CID" --region "$REGION" \
      --vcn-id "$VCN_ID" --query 'data[0]."id"' --raw-output)" \
    --region "$REGION" \
    --route-rules "[{\"destination\":\"0.0.0.0/0\",\"destinationType\":\"CIDR_BLOCK\",\"networkEntityId\":\"$INTERNET_GATEWAY_ID\"}]" \
    --force >/dev/null

  # Allow SSH + app port from anywhere
  SL_ID=$(oci network security-list list --compartment-id "$CID" --region "$REGION" \
    --vcn-id "$VCN_ID" --query 'data[0]."id"' --raw-output)
  oci network security-list update --security-list-id "$SL_ID" --region "$REGION" \
    --ingress-security-rules '[
      {"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":22,"max":22}}},
      {"source":"0.0.0.0/0","protocol":"6","tcpOptions":{"destinationPortRange":{"min":3000,"max":3000}}}
    ]' --egress-security-rules '[{"destination":"0.0.0.0/0","protocol":"all"}]' \
    --force >/dev/null

  log "Launching instance ($SHAPE, $OCPUS OCPU, $MEM_GB GB)..."
  INSTANCE_ID=""
  LAUNCH_ERR="$(mktemp)"
  for attempt in $(seq 1 60); do
    # Adopt an instance with our display-name if one already exists (e.g. the
    # user created it manually in the console while we were retrying capacity).
    EXISTING_ID=$(oci compute instance list --compartment-id "$CID" --region "$REGION" --all \
      2>/dev/null | jq -r --arg n "$INSTANCE_NAME" \
      '[.data[] | select(."display-name" == $n and ."lifecycle-state" != "TERMINATING" and ."lifecycle-state" != "TERMINATED")][0].id // empty' || true)
    if [ -n "$EXISTING_ID" ]; then
      INSTANCE_ID="$EXISTING_ID"
      log "Adopting existing instance $INSTANCE_NAME ($INSTANCE_ID)"
      break
    fi
    if INSTANCE_ID=$(oci compute instance launch \
      --compartment-id "$CID" --region "$REGION" \
      --availability-domain "$AD_NAME" \
      --image-id "$IMAGE_ID" --shape "$SHAPE" \
      --shape-config "{\"ocpus\": $OCPUS, \"memoryInGBs\": $MEM_GB}" \
      --subnet-id "$SUBNET_ID" \
      --assign-public-ip true \
      --display-name "$INSTANCE_NAME" \
      --ssh-authorized-keys-file "$PUBKEY_FILE" \
      --boot-volume-size-in-gbs 50 \
      --query 'data."id"' --raw-output 2>"$LAUNCH_ERR"); then
      break
    fi
    printf 'launch attempt %d failed: ' "$attempt" >&2
    tr -d '\000-\010\013\014\016-\037' < "$LAUNCH_ERR" | grep -aoE '"(code|message)": "[^"]*"' >&2 || true
    INSTANCE_ID=""
    sleep 90 # A1 host capacity (500 Out of host capacity) frees up intermittently
  done
  rm -f "$LAUNCH_ERR"
  [ -n "$INSTANCE_ID" ] || die "instance launch failed after 60 attempts (~90 min of A1 capacity retries)"

  log "Waiting for instance to be RUNNING (up to 5 min)..."
  STATE=""
  for _ in $(seq 1 30); do
    STATE=$(oci compute instance get --instance-id "$INSTANCE_ID" --region "$REGION" \
      --query 'data."lifecycle-state"' --raw-output 2>/dev/null || echo UNKNOWN)
    [ "$STATE" = "RUNNING" ] && break
    sleep 10
  done
  [ "$STATE" = "RUNNING" ] || die "Instance not RUNNING after 5 min (state: ${STATE:-unknown})"

  sleep 15 # let the VNIC attach
  ORACLE_HOST=$(oci compute instance list-vnics --instance-id "$INSTANCE_ID" \
    --region "$REGION" --query 'data[0]."public-ip"' --raw-output)
  log "Instance ready: $ORACLE_HOST"
  echo "$ORACLE_HOST" > "$REPO_ROOT/.oracle-host"
else
  log "Deploying to existing instance $ORACLE_HOST"
fi

SSH=(ssh "${SSH_OPTS[@]}" "$SSH_USER@$ORACLE_HOST")
SCP=(scp "${SCP_OPTS[@]}")

# ── Step1: Sync source ─────────────────────────────────────────────────────
log "Syncing nautilus-server source..."
"${SSH[@]}" "mkdir -p $REMOTE_DIR/src/apps/vibeguard"
"${SCP[@]}" "$REPO_ROOT/src/nautilus-server/Cargo.toml" "$SSH_USER@$ORACLE_HOST:$REMOTE_DIR/Cargo.toml"
"${SCP[@]}" "$REPO_ROOT/src/nautilus-server/Cargo.lock" "$SSH_USER@$ORACLE_HOST:$REMOTE_DIR/Cargo.lock"
"${SCP[@]}" "$REPO_ROOT/src/nautilus-server/src/apps/mod.rs" "$SSH_USER@$ORACLE_HOST:$REMOTE_DIR/src/apps/mod.rs"
"${SCP[@]}" "$REPO_ROOT/src/nautilus-server/src/main.rs" "$SSH_USER@$ORACLE_HOST:$REMOTE_DIR/src/main.rs"
"${SCP[@]}" "$REPO_ROOT/src/nautilus-server/src/lib.rs" "$SSH_USER@$ORACLE_HOST:$REMOTE_DIR/src/lib.rs"
"${SCP[@]}" "$REPO_ROOT/src/nautilus-server/src/common.rs" "$SSH_USER@$ORACLE_HOST:$REMOTE_DIR/src/common.rs"
for f in "$REPO_ROOT"/src/nautilus-server/src/apps/vibeguard/*.rs; do
  "${SCP[@]}" "$f" "$SSH_USER@$ORACLE_HOST:$REMOTE_DIR/src/apps/vibeguard/"
done
for f in "$REPO_ROOT"/src/nautilus-server/src/attestation/*.rs; do
  "${SCP[@]}" "$f" "$SSH_USER@$ORACLE_HOST:$REMOTE_DIR/src/attestation/"
done

# ── Step2: Install toolchain + build ───────────────────────────────────────
log "Installing Rust toolchain and building (this takes ~10-15 min on A1)..."
"${SSH[@]}" "
  set -e
  sudo apt-get update -qq
  sudo apt-get install -y -qq build-essential pkg-config libssl-dev jq curl
  if ! command -v cargo >/dev/null; then
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
  fi
  . \"\$HOME/.cargo/env\"
  cd $REMOTE_DIR && cargo build --release 2>&1 | tail -3
"

# ── Step3: Keypair + env + systemd ─────────────────────────────────────────
log "Configuring keypair, env and systemd service..."
"${SSH[@]}" "
  set -e
  mkdir -p $REMOTE_DIR
  if [ ! -f $REMOTE_DIR/enclave-keypair.json ]; then
    SEED_HEX=\$(openssl rand -hex 32)
    printf '{\"seed_hex\":\"%s\"}' \"\$SEED_HEX\" | sudo tee $REMOTE_DIR/enclave-keypair.json >/dev/null
  fi
  sudo chmod 600 $REMOTE_DIR/enclave-keypair.json
  sudo chown -R $USER $REMOTE_DIR

  sudo tee /etc/systemd/system/vibeguard-nautilus.service >/dev/null <<UNIT
[Unit]
Description=VibeGuard Nautilus Server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$REMOTE_DIR
Environment=KEYPAIR_PATH=$REMOTE_DIR/enclave-keypair.json
Environment=VIBEGUARD_TEE_MODE=simulation
Environment=RUST_LOG=info
ExecStart=$REMOTE_DIR/target/release/nautilus-server
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT

  # Keep-warm timer: avoids Oracle Always Free idle reclamation (~20 min)
  sudo tee /etc/systemd/system/vibeguard-keepwarm.service >/dev/null <<UNIT2
[Unit]
Description=VibeGuard keep-warm curl

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -sf http://localhost:3000/health_check
StandardOutput=null
StandardError=journal
UNIT2
  sudo tee /etc/systemd/system/vibeguard-keepwarm.timer >/dev/null <<UNIT3
[Unit]
Description=VibeGuard keep-warm every20 min

[Timer]
OnBootSec=5min
OnUnitActiveSec=20min

[Install]
WantedBy=timers.target
UNIT3

  sudo systemctl daemon-reload
  sudo systemctl enable --now vibeguard-nautilus
  sudo systemctl enable --now vibeguard-keepwarm.timer
  sleep 3
"

# ── Step4: Smoke test ──────────────────────────────────────────────────────
log "Smoke-testing /health_check..."
"${SSH[@]}" "
  for i in \$(seq 1 15); do
    if curl -sf http://localhost:3000/health_check; then exit 0; fi
    sleep 2
  done
  echo 'health_check did not come up' >&2
  sudo systemctl --no-pager status vibeguard-nautilus | tail -15 >&2
  exit 1
"
echo ""

log "✅ Deployed. Enclave API at http://$ORACLE_HOST:3000"
echo "   health_check: http://$ORACLE_HOST:3000/health_check"
echo "   attestation:  http://$ORACLE_HOST:3000/get_attestation"
echo "   SSH back in:  ssh $SSH_USER@$ORACLE_HOST"
