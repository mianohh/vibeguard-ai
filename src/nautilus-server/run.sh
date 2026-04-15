#!/bin/bash
# run.sh - Enclave traffic rules and external domain allowlist
#
# This script configures the enclave's network access.
# Only whitelisted domains can be accessed from inside the enclave.

set -e

echo "🔒 Configuring enclave traffic rules..."

# Allowed external domains
# LocalThreatAgent runs entirely inside enclave - no external API calls needed
# Only Seal key servers are required for configuration decryption
ALLOWED_DOMAINS=(
    "seal-testnet.walrus.space"          # Seal key servers
    "aggregator.walrus-testnet.walrus.space"  # Walrus (for evidence storage)
)

echo "✅ Allowed domains:"
for domain in "${ALLOWED_DOMAINS[@]}"; do
    echo "   - $domain"
done

# In production AWS Nitro Enclave, configure iptables rules here
# For local testing, this is a no-op

echo "🚀 Starting Nautilus server..."
exec /app/target/release/nautilus-server
