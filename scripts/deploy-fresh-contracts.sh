#!/bin/bash
# deploy-fresh-contracts.sh
# Deploy fresh VibeGuard contracts with LocalThreatAgent configuration

set -e

echo "🚀 VibeGuard Fresh Contract Deployment"
echo "======================================"
echo ""

# Check if sui CLI is available
if ! command -v sui &> /dev/null; then
    echo "❌ Error: sui CLI not found. Please install Sui CLI first."
    exit 1
fi

# Check active address
ACTIVE_ADDRESS=$(sui client active-address 2>/dev/null || echo "")
if [ -z "$ACTIVE_ADDRESS" ]; then
    echo "❌ Error: No active Sui address. Run 'sui client' to set up."
    exit 1
fi

echo "Active Address: $ACTIVE_ADDRESS"
echo "Network: $(sui client active-env)"
echo ""

# Step 1: Deploy SealEnclave Package
echo "Step 1: Deploying SealEnclave package..."
echo "----------------------------------------"
cd move/seal_enclave

sui move build
echo ""
echo "📦 Publishing SealEnclave package..."

PUBLISH_OUTPUT=$(sui client publish --gas-budget 100000000 --json 2>&1)

# Extract package ID and object IDs from JSON output
PACKAGE_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '.objectChanges[] | select(.type == "published") | .packageId')
ENCLAVE_CONFIG_ID=$(echo "$PUBLISH_OUTPUT" | jq -r '.objectChanges[] | select(.objectType | contains("EnclaveConfig")) | .objectId')

if [ -z "$PACKAGE_ID" ] || [ "$PACKAGE_ID" == "null" ]; then
    echo "❌ Failed to extract package ID from publish output"
    echo "$PUBLISH_OUTPUT"
    exit 1
fi

echo "✅ SealEnclave deployed!"
echo "   Package ID: $PACKAGE_ID"
echo "   EnclaveConfig ID: $ENCLAVE_CONFIG_ID"
echo ""

# Step 2: Generate mock PCRs for testing
echo "Step 2: Generating mock PCRs..."
echo "--------------------------------"

# Mock PCRs (48 bytes each) - in production, these come from 'make pcrs'
PCR0="0x911c87d0abc8c9840a0810d57dfb718865f35dc42010a2d5b30e7840b03edeea83a26aad51593ade1e47ab6cced4653e"
PCR1="0x911c87d0abc8c9840a0810d57dfb718865f35dc42010a2d5b30e7840b03edeea83a26aad51593ade1e47ab6cced4653e"
PCR2="0x21b9efbc184807662e966d34f390821309eeac6802309798826296bf3e8bec7c10edb30948c90ba67310f7b964fc500a"

echo "   PCR0: ${PCR0:0:20}..."
echo "   PCR1: ${PCR1:0:20}..."
echo "   PCR2: ${PCR2:0:20}..."
echo ""

# Step 3: Generate mock enclave public key
echo "Step 3: Generating mock enclave public key..."
echo "----------------------------------------------"

# Mock Ed25519 public key (32 bytes) - in production, this comes from /get_attestation
ENCLAVE_PUBLIC_KEY="0x$(openssl rand -hex 32)"

echo "   Public Key: ${ENCLAVE_PUBLIC_KEY:0:20}..."
echo ""

# Step 4: Register enclave
echo "Step 4: Registering enclave on-chain..."
echo "----------------------------------------"

REGISTER_OUTPUT=$(sui client call \
    --package "$PACKAGE_ID" \
    --module enclave \
    --function register_enclave \
    --args "$ENCLAVE_CONFIG_ID" "$PCR0" "$PCR1" "$PCR2" "$ENCLAVE_PUBLIC_KEY" \
    --gas-budget 10000000 \
    --json 2>&1)

REGISTER_TX=$(echo "$REGISTER_OUTPUT" | jq -r '.digest')

if [ -z "$REGISTER_TX" ] || [ "$REGISTER_TX" == "null" ]; then
    echo "❌ Failed to register enclave"
    echo "$REGISTER_OUTPUT"
    exit 1
fi

echo "✅ Enclave registered!"
echo "   Transaction: $REGISTER_TX"
echo ""

# Step 5: Save deployment info
echo "Step 5: Saving deployment info..."
echo "----------------------------------"

cat > ../../deployment-info.json <<EOF
{
  "network": "$(sui client active-env)",
  "deployed_at": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployer": "$ACTIVE_ADDRESS",
  "contracts": {
    "seal_enclave": {
      "package_id": "$PACKAGE_ID",
      "enclave_config_id": "$ENCLAVE_CONFIG_ID"
    }
  },
  "enclave": {
    "pcr0": "$PCR0",
    "pcr1": "$PCR1",
    "pcr2": "$PCR2",
    "public_key": "$ENCLAVE_PUBLIC_KEY"
  },
  "transactions": {
    "publish": "$(echo "$PUBLISH_OUTPUT" | jq -r '.digest')",
    "register_enclave": "$REGISTER_TX"
  },
  "notes": [
    "PCRs are mock values for testing",
    "In production, PCRs come from 'make pcrs' in src/nautilus-server",
    "Public key is mock - in production, comes from enclave /get_attestation endpoint",
    "LocalThreatAgent configuration should be encrypted with Seal using these PCRs"
  ]
}
EOF

echo "✅ Deployment info saved to deployment-info.json"
echo ""

# Step 6: Update environment variables
echo "Step 6: Updating .env file..."
echo "------------------------------"

cd ../..

# Backup existing .env
if [ -f .env ]; then
    cp .env .env.backup
    echo "   Backed up existing .env to .env.backup"
fi

# Update or create .env
cat > .env.new <<EOF
# VibeGuard Environment Configuration
# Generated: $(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Network
NEXT_PUBLIC_NETWORK=testnet

# SealEnclave Contract
SEAL_ENCLAVE_PACKAGE_ID=$PACKAGE_ID
ENCLAVE_CONFIG_OBJECT_ID=$ENCLAVE_CONFIG_ID

# Enclave Configuration (Mock - replace with real values in production)
ENCLAVE_PCR0=$PCR0
ENCLAVE_PCR1=$PCR1
ENCLAVE_PCR2=$PCR2
ENCLAVE_PUBLIC_KEY=$ENCLAVE_PUBLIC_KEY

# Enclave URL (update when deployed to AWS)
ENCLAVE_URL=http://localhost:3000

# ReputationRegistry (keep existing if present)
$(grep "REPUTATION_REGISTRY" .env 2>/dev/null || echo "# REPUTATION_REGISTRY_PACKAGE_ID=")
$(grep "REPUTATION_REGISTRY_OBJECT_ID" .env 2>/dev/null || echo "# REPUTATION_REGISTRY_OBJECT_ID=")

# Walrus Configuration (keep existing if present)
$(grep "WALRUS" .env 2>/dev/null || echo "# WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space")
$(grep "WALRUS" .env 2>/dev/null || echo "# WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space")

# LocalThreatAgent Configuration
# This should be encrypted using Seal and provisioned to the enclave
# Run: npm run seal:setup
AGENT_CONFIG='{"scoring_weights":{"intent_mismatch":10.0,"asset_drain":8.0,"permission_change":7.0,"complexity":3.0},"risk_thresholds":{"red_threshold":8.0,"yellow_threshold":4.0},"heuristic_rules":{"max_safe_complexity":5,"suspicious_keywords":["drain","exploit","phishing"]}}'
EOF

mv .env.new .env
echo "✅ .env file updated"
echo ""

# Step 7: Summary
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "📋 Summary:"
echo "   • SealEnclave Package: $PACKAGE_ID"
echo "   • EnclaveConfig Object: $ENCLAVE_CONFIG_ID"
echo "   • Enclave Registered: $REGISTER_TX"
echo ""
echo "🔗 View on Explorer:"
echo "   Package: https://suiscan.xyz/testnet/object/$PACKAGE_ID"
echo "   Config: https://suiscan.xyz/testnet/object/$ENCLAVE_CONFIG_ID"
echo "   Register TX: https://suiscan.xyz/testnet/tx/$REGISTER_TX"
echo ""
echo "📝 Next Steps:"
echo "   1. Update README.md with new contract addresses"
echo "   2. Build and deploy Nautilus enclave: cd src/nautilus-server && make build"
echo "   3. Get real PCRs: make pcrs"
echo "   4. Deploy to AWS Nitro and get real attestation"
echo "   5. Re-register with real PCRs and public key"
echo "   6. Encrypt agent config with Seal: npm run seal:setup"
echo "   7. Complete Seal key load in enclave"
echo ""
echo "💡 For production deployment, see deployment-info.json"
echo ""
