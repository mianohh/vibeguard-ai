#!/bin/bash
# simulate-nitro-enclave.sh
# Local simulation of AWS Nitro Enclave for PCR generation and testing
# This allows testing the full Nautilus flow without AWS infrastructure

set -e

echo "🔒 VibeGuard Nautilus - Local Enclave Simulation"
echo "================================================"
echo ""

# Check dependencies
command -v sha384sum >/dev/null 2>&1 || { echo "❌ sha384sum not found."; exit 1; }

# Configuration
PCR_OUTPUT_DIR="out"

echo "Step 1: Building Nautilus server locally..."
echo "--------------------------------------------"
cd "$(dirname "$0")/../src/nautilus-server"

# Build locally
cargo build --release

echo "✅ Binary built: target/release/nautilus-server"
echo ""

echo "Step 2: Generating PCR measurements..."
echo "---------------------------------------"

# Create output directory
mkdir -p $PCR_OUTPUT_DIR

# Generate PCR0 (enclave image measurement)
# In real AWS Nitro, this is the hash of the entire EIF file
# For simulation, we hash the binary
PCR0=$(sha384sum target/release/nautilus-server | awk '{print $1}')

# Generate PCR1 (kernel + boot ramdisk measurement)
# In real AWS Nitro, this is the hash of the Linux kernel
# For simulation, we use a fixed value representing the "kernel"
PCR1=$(echo -n "vibeguard-nautilus-kernel-v1" | sha384sum | awk '{print $1}')

# Generate PCR2 (application measurement)
# In real AWS Nitro, this is the hash of run.sh and traffic rules
# For simulation, we hash run.sh
PCR2=$(sha384sum run.sh | awk '{print $1}')

# Save PCRs
cat > $PCR_OUTPUT_DIR/nitro.pcrs <<EOF
PCR0=$PCR0
PCR1=$PCR1
PCR2=$PCR2
EOF

echo "✅ PCR measurements generated:"
echo "   PCR0 (binary): ${PCR0:0:32}..."
echo "   PCR1 (kernel): ${PCR1:0:32}..."
echo "   PCR2 (config): ${PCR2:0:32}..."
echo ""
echo "   Full PCRs saved to: $PCR_OUTPUT_DIR/nitro.pcrs"
echo ""

echo "Step 3: Starting enclave simulation..."
echo "---------------------------------------"

# Start server in background
RUST_LOG=info target/release/nautilus-server &
SERVER_PID=$!

echo "✅ Enclave simulation running"
echo "   PID: $SERVER_PID"
echo "   Public endpoints: http://localhost:3000"
echo "   Admin endpoints: http://localhost:3001"
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Stopping enclave simulation..."
    kill $SERVER_PID 2>/dev/null || true
    exit
}
trap cleanup EXIT INT TERM

# Wait for server to start
echo "⏳ Waiting for server to initialize..."
sleep 3

# Test health check
if curl -s http://localhost:3000/health_check | grep -q "healthy"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi
echo ""

echo "Step 4: Generating mock attestation document..."
echo "------------------------------------------------"

# Generate mock enclave public key
ENCLAVE_PUBLIC_KEY=$(openssl rand -hex 32)

cat > $PCR_OUTPUT_DIR/attestation.json <<EOF
{
  "module_id": "vibeguard-nautilus-enclave",
  "timestamp": $(date +%s)000,
  "digest": "SHA384",
  "pcrs": {
    "0": "$PCR0",
    "1": "$PCR1",
    "2": "$PCR2"
  },
  "certificate": "MOCK_CERTIFICATE_CHAIN",
  "cabundle": ["MOCK_CA_BUNDLE"],
  "public_key": "$ENCLAVE_PUBLIC_KEY",
  "user_data": null,
  "nonce": null
}
EOF

echo "✅ Mock attestation document created"
echo "   File: $PCR_OUTPUT_DIR/attestation.json"
echo ""

echo "Step 5: Testing enclave endpoints..."
echo "-------------------------------------"

# Test /process_data
echo "Testing threat analysis..."
RESPONSE=$(curl -s -X POST http://localhost:3000/process_data \
  -H 'Content-Type: application/json' \
  -d '{
    "payload": {
      "transaction_bytes": "AAACAAhQAAAAAAAAACCpBwAAAAAAAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBAQABAQACAAABAQDAlpgAAAAAACCpBwAAAAAAAQA=",
      "user_intent": "Claim airdrop",
      "user_address": "0xa9070000000000000000000000000000",
      "network": "testnet"
    }
  }')

if echo "$RESPONSE" | grep -q "risk_level"; then
    echo "✅ Threat analysis working"
    RISK_LEVEL=$(echo "$RESPONSE" | grep -o '"risk_level":"[^"]*"' | cut -d'"' -f4)
    echo "   Risk Level: $RISK_LEVEL"
else
    echo "❌ Threat analysis failed"
    echo "$RESPONSE"
fi
echo ""

echo "================================================"
echo "✅ Enclave Simulation Complete!"
echo "================================================"
echo ""
echo "📋 Summary:"
echo "   • Binary: target/release/nautilus-server"
echo "   • PCRs: $PCR_OUTPUT_DIR/nitro.pcrs"
echo "   • Attestation: $PCR_OUTPUT_DIR/attestation.json"
echo "   • PID: $SERVER_PID"
echo ""
echo "🔗 Endpoints:"
echo "   • Health: http://localhost:3000/health_check"
echo "   • Process Data: http://localhost:3000/process_data"
echo "   • Attestation: http://localhost:3000/get_attestation"
echo ""
echo "📝 Next Steps:"
echo "   1. Register PCRs on-chain:"
echo "      sui client call --function register_enclave \\"
echo "        --args <config_id> 0x$PCR0 0x$PCR1 0x$PCR2 <public_key>"
echo ""
echo "   2. Test threat analysis:"
echo "      npm run test:nautilus:e2e"
echo ""
echo "   3. Stop simulation:"
echo "      kill $SERVER_PID"
echo ""
echo "💡 For production deployment, build AWS Nitro EIF:"
echo "   docker build -t vibeguard-nautilus:latest ."
echo "   nitro-cli build-enclave --docker-uri vibeguard-nautilus:latest --output-file vibeguard.eif"
echo ""

# Keep server running
echo "Press Ctrl+C to stop the simulation..."
wait $SERVER_PID
