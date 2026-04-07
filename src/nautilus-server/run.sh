#!/bin/bash
# run.sh - Enclave traffic rules and external domain allowlist
#
# This script configures the enclave's network access.
# Only whitelisted domains can be accessed from inside the enclave.

set -e

echo "🔒 Configuring enclave traffic rules..."

# Allowed external domains
# Add any domains the enclave needs to access
ALLOWED_DOMAINS=(
    "generativelanguage.googleapis.com"  # Gemini API
    "seal-testnet.walrus.space"          # Seal key servers (if needed)
)

echo "✅ Allowed domains:"
for domain in "${ALLOWED_DOMAINS[@]}"; do
    echo "   - $domain"
done

# In production AWS Nitro Enclave, configure iptables rules here
# For local testing, this is a no-op

echo "🚀 Starting Nautilus server..."
exec /app/target/release/nautilus-server
