#!/bin/bash
# register-pcrs-production.sh
# Register real AWS Nitro Enclave PCRs on-chain

set -e

echo "🔐 Registering Production PCRs On-Chain"
echo "========================================"

# Load PCRs from file
if [ ! -f "pcrs-production.txt" ]; then
    echo "❌ pcrs-production.txt not found"
    echo "Run deploy-aws-enclave.sh first"
    exit 1
fi

source pcrs-production.txt

echo "PCR0: $PCR0"
echo "PCR1: $PCR1"
echo "PCR2: $PCR2"
echo "Enclave URL: http://$PUBLIC_IP:3000"
echo ""

# Load contract addresses from .env
if [ ! -f ".env" ]; then
    echo "❌ .env file not found"
    exit 1
fi

source .env

echo "Seal Enclave Package: $SEAL_ENCLAVE_PACKAGE_ID"
echo "Enclave Config Object: $ENCLAVE_CONFIG_OBJECT_ID"
echo ""

# Get public key from live enclave
echo "Fetching public key from enclave..."
PUBLIC_KEY=$(curl -s "http://$PUBLIC_IP:3000/health_check" | jq -r .pk)

echo "Public Key: $PUBLIC_KEY"
echo ""

# Register enclave with all parameters
echo "Registering enclave on-chain..."

sui client call \
  --package "$SEAL_ENCLAVE_PACKAGE_ID" \
  --module enclave \
  --function register_enclave \
  --args \
    "$ENCLAVE_CONFIG_OBJECT_ID" \
    "0x$PCR0" \
    "0x$PCR1" \
    "0x$PCR2" \
    "0x$PUBLIC_KEY" \
  --gas-budget 10000000

echo "✅ Enclave registered"
echo ""

# Verify registration
echo "Verifying on-chain registration..."
sui client object "$ENCLAVE_CONFIG_OBJECT_ID"

echo ""
echo "✅ Registration complete!"
echo ""
echo "Update your .env file:"
echo "ENCLAVE_URL=http://$PUBLIC_IP:3000"
echo "ENCLAVE_PUBLIC_KEY=$PUBLIC_KEY"
echo "USE_REAL_ENCLAVE=true"
