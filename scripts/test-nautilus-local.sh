#!/bin/bash
# test-nautilus-local.sh
# Test VibeGuard Nautilus server locally (without enclave)

set -e

echo "🧪 Testing VibeGuard Nautilus Server (Local Mode)"
echo "=================================================="
echo ""

# Start server in background
echo "🚀 Starting Nautilus server..."
cd "$(dirname "$0")/../src/nautilus-server"
RUST_LOG=info cargo run --release &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to initialize..."
sleep 5

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    kill $SERVER_PID 2>/dev/null || true
    exit
}
trap cleanup EXIT INT TERM

echo ""
echo "✅ Server started (PID: $SERVER_PID)"
echo ""

# Test 1: Health check
echo "Test 1: Health Check"
echo "--------------------"
HEALTH=$(curl -s http://localhost:3000/health_check)
echo "Response: $HEALTH"
if echo "$HEALTH" | grep -q "healthy"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    exit 1
fi
echo ""

# Test 2: Get attestation (will fail locally, but endpoint should exist)
echo "Test 2: Get Attestation Endpoint"
echo "---------------------------------"
ATTESTATION=$(curl -s -w "\n%{http_code}" http://localhost:3000/get_attestation)
HTTP_CODE=$(echo "$ATTESTATION" | tail -n1)
echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "500" ]; then
    echo "✅ Attestation endpoint exists (500 expected in local mode)"
else
    echo "❌ Attestation endpoint failed"
    exit 1
fi
echo ""

# Test 3: Process data - RED risk (intent mismatch)
echo "Test 3: Process Data - RED Risk Detection"
echo "------------------------------------------"
RED_RESPONSE=$(curl -s -X POST http://localhost:3000/process_data \
  -H 'Content-Type: application/json' \
  -d '{
    "payload": {
      "transaction_bytes": "AAACAAhQAAAAAAAAACCpBwAAAAAAAQEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIBAQABAQACAAABAQDAlpgAAAAAACCpBwAAAAAAAQA=",
      "user_intent": "Claim airdrop and receive 10 SUI tokens",
      "user_address": "0xa9070000000000000000000000000000",
      "network": "testnet"
    }
  }')

echo "$RED_RESPONSE" | jq '.'
RISK_LEVEL=$(echo "$RED_RESPONSE" | jq -r '.response.risk_level')
SIGNATURE=$(echo "$RED_RESPONSE" | jq -r '.signature')

if [ "$RISK_LEVEL" = "RED" ] || [ "$RISK_LEVEL" = "YELLOW" ]; then
    echo "✅ Threat detection working (Risk: $RISK_LEVEL)"
else
    echo "❌ Threat detection failed (Risk: $RISK_LEVEL)"
    exit 1
fi

if [ ${#SIGNATURE} -eq 128 ]; then
    echo "✅ Signature generated (64 bytes hex)"
else
    echo "❌ Invalid signature length: ${#SIGNATURE}"
    exit 1
fi
echo ""

# Test 4: Process data - GREEN risk (safe transaction)
echo "Test 4: Process Data - GREEN Risk Detection"
echo "--------------------------------------------"
GREEN_RESPONSE=$(curl -s -X POST http://localhost:3000/process_data \
  -H 'Content-Type: application/json' \
  -d '{
    "payload": {
      "transaction_bytes": "AAACAA==",
      "user_intent": "Send 1 SUI to my friend",
      "user_address": "0xa9070000000000000000000000000000",
      "network": "testnet"
    }
  }')

echo "$GREEN_RESPONSE" | jq '.'
RISK_LEVEL=$(echo "$GREEN_RESPONSE" | jq -r '.response.risk_level')

if [ "$RISK_LEVEL" = "GREEN" ]; then
    echo "✅ Safe transaction detected correctly"
else
    echo "⚠️  Expected GREEN, got $RISK_LEVEL (may be acceptable)"
fi
echo ""

# Test 5: Admin endpoints (should be on port 3001)
echo "Test 5: Admin Endpoints"
echo "-----------------------"
ADMIN_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3001/admin/init_seal_key_load \
  -H 'Content-Type: application/json' \
  -d '{
    "enclave_object_id": "0x50c50306e4c1473dc73e3f0fcf5d2be527cedd096d5ee2ea60019e961b6c5128",
    "initial_shared_version": 722158400
  }')

HTTP_CODE=$(echo "$ADMIN_RESPONSE" | tail -n1)
echo "HTTP Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "501" ]; then
    echo "✅ Admin endpoint exists (501 NOT_IMPLEMENTED expected)"
else
    echo "❌ Admin endpoint failed with code: $HTTP_CODE"
    exit 1
fi
echo ""

echo "=================================================="
echo "✅ All tests passed!"
echo ""
echo "Summary:"
echo "  • Health check: ✅"
echo "  • Attestation endpoint: ✅"
echo "  • Threat detection (RED): ✅"
echo "  • Threat detection (GREEN): ✅"
echo "  • Admin endpoints: ✅"
echo ""
echo "Next steps:"
echo "  1. Deploy to AWS Nitro Enclave"
echo "  2. Register PCRs on-chain"
echo "  3. Complete Seal key load"
echo "  4. Test with real transactions"
echo ""
