# VibeGuard Reputation Registry with Walrus Integration

On-chain reputation registry for malicious Sui packages with decentralized threat report storage via Walrus.

## Architecture

```
User Reports Scam → AI Analysis → Walrus Storage → On-Chain Registry
                                      ↓
                              Returns blob_id
                                      ↓
                          Stored in Move contract
```

## Features

- **Decentralized Storage**: Threat reports stored on Walrus, only blob_id on-chain
- **zkLogin Integration**: Gasless reporting via sponsored transactions
- **Community-Driven**: Anyone can report malicious contracts
- **Admin Moderation**: Remove false positives
- **Immutable Evidence**: Walrus ensures threat reports cannot be tampered with

## Contract Structure

### BlacklistEntry
```move
struct BlacklistEntry {
    package_id: address,
    walrus_blob_id: String,  // Reference to Walrus-stored threat report
    severity: u8,            // 1=Low, 2=Medium, 3=High, 4=Critical
    added_at: u64,
    reporter: address
}
```

### Functions

#### Public Entry Functions
- `report_malicious_contract`: Report a scam with Walrus blob reference
- `remove_package`: Admin function to remove false positives

#### View Functions
- `is_blacklisted`: Check if package is blacklisted
- `get_entry`: Get full entry details including Walrus blob_id
- `get_total_reports`: Get total number of reports

## Deployment

### Prerequisites

```bash
# Install Sui CLI
cargo install --locked --git https://github.com/MystenLabs/sui.git --branch testnet sui

# Get testnet SUI
sui client faucet
```

### Build & Test

```bash
cd move/reputation_registry

# Build
sui move build

# Run tests
sui move test
```

### Deploy to Testnet

```bash
sui client publish --gas-budget 100000000
```

**Save these values:**
- Package ID: `0x...`
- AdminCap Object ID: `0x...`
- ReputationRegistry Object ID: `0x...`

## Usage

### Report Malicious Contract (via zkLogin)

```typescript
// 1. Upload threat report to Walrus
const blobId = await publishThreatReportToWalrus(reportData);

// 2. Submit on-chain via sponsored transaction
const tx = new Transaction();
tx.moveCall({
  target: `${PACKAGE_ID}::registry::report_malicious_contract`,
  arguments: [
    tx.object(REGISTRY_ID),
    tx.pure.address(maliciousPackageId),
    tx.pure.string(blobId),
    tx.pure.u8(4) // severity
  ]
});
```

### Query Blacklist

```typescript
import { SuiClient } from '@mysten/sui.js/client';

const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io' });

// Check if package is blacklisted
const registry = await client.getObject({
  id: REGISTRY_ID,
  options: { showContent: true }
});

// Parse blacklist table
const isBlacklisted = /* check table */;
```

### Retrieve Threat Report from Walrus

```typescript
// Get blob_id from on-chain entry
const entry = await getBlacklistEntry(packageId);
const blobId = entry.walrus_blob_id;

// Fetch from Walrus aggregator
const response = await fetch(
  `https://aggregator.walrus-testnet.walrus.space/v1/${blobId}`
);
const threatReport = await response.json();
```

## Integration with VibeGuard

VibeGuard will:
1. Check on-chain registry for blacklisted packages
2. If blacklisted, fetch full threat report from Walrus
3. Display detailed scam analysis to user

## Security

- Registry is a shared object (anyone can read)
- Only reporter can submit (via zkLogin)
- Admin can remove false positives
- Walrus ensures threat reports are immutable and censorship-resistant

## Testnet Endpoints

- **Sui RPC**: `https://fullnode.testnet.sui.io`
- **Walrus Publisher**: `https://publisher.walrus-testnet.walrus.space`
- **Walrus Aggregator**: `https://aggregator.walrus-testnet.walrus.space`

## License

MIT
