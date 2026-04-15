#!/bin/bash
# register-pcrs.sh
# Register real PCR measurements from local simulation on-chain

set -e

echo "🔐 Registering Real PCRs On-Chain"
echo "=================================="
echo ""

# Configuration
SEAL_PACKAGE_ID="0x75f9626ccc7e848c58823924644e5d5167d7231e381fe49734200d81b2419fdc"
ENCLAVE_CONFIG_ID="0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502"
PCR_FILE="src/nautilus-server/out/nitro.pcrs"
ATTESTATION_FILE="src/nautilus-server/out/attestation.json"

# Check if files exist
if [ ! -f "$PCR_FILE" ]; then
    echo "❌ PCR file not found: $PCR_FILE"
    echo "Run 'npm run simulate:enclave' first to generate PCRs"
    exit 1
fi

if [ ! -f "$ATTESTATION_FILE" ]; then
    echo "❌ Attestation file not found: $ATTESTATION_FILE"
    echo "Run 'npm run simulate:enclave' first to generate attestation"
    exit 1
fi

# Extract PCRs
source "$PCR_FILE"

# Extract public key from attestation
PUBLIC_KEY=$(jq -r '.public_key' "$ATTESTATION_FILE")

echo "📋 Registration Details:"
echo "   Package ID: $SEAL_PACKAGE_ID"
echo "   Config ID: $ENCLAVE_CONFIG_ID"
echo ""
echo "   PCR0: ${PCR0:0:32}..."
echo "   PCR1: ${PCR1:0:32}..."
echo "   PCR2: ${PCR2:0:32}..."
echo "   Public Key: ${PUBLIC_KEY:0:32}..."
echo ""

# Confirm
read -p "Register these PCRs on-chain? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Registration cancelled"
    exit 1
fi

echo ""
echo "📡 Submitting transaction..."

# Register on-chain
sui client call \
  --package "$SEAL_PACKAGE_ID" \
  --module enclave \
  --function register_enclave \
  --args "$ENCLAVE_CONFIG_ID" \
    "0x$PCR0" \
    "0x$PCR1" \
    "0x$PCR2" \
    "0x$PUBLIC_KEY" \
  --gas-budget 10000000

echo ""
echo "✅ PCRs registered on-chain!"
echo ""
echo "🔗 View on Suiscan:"
echo "   https://suiscan.xyz/testnet/object/$ENCLAVE_CONFIG_ID"
echo ""
