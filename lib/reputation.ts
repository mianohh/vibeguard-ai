// Known safe Sui framework packages
const WHITELISTED_PACKAGES = [
  '0x1',
  '0x2',
  '0x3',
  '0x0000000000000000000000000000000000000000000000000000000000000001',
  '0x0000000000000000000000000000000000000000000000000000000000000002',
  '0x0000000000000000000000000000000000000000000000000000000000000003',
  '0xdee9', // Mock DeepBook
];

// Known malicious packages
const BLACKLISTED_PACKAGES = [
  '0xbad1',
  '0xscam',
  '0xbad1c0ffee',
  '0xscam1234567890abcdef',
];

export interface ReputationResult {
  status: 'SAFE' | 'MALICIOUS' | 'UNKNOWN';
  matchedPackage?: string;
  reason?: string;
}

export function checkReputation(packageIds: string[]): ReputationResult {
  // Check blacklist first - immediate fail
  for (const pkgId of packageIds) {
    const normalized = pkgId.toLowerCase();
    
    for (const blacklisted of BLACKLISTED_PACKAGES) {
      if (normalized.includes(blacklisted.toLowerCase()) || normalized === blacklisted.toLowerCase()) {
        return {
          status: 'MALICIOUS',
          matchedPackage: pkgId,
          reason: `Package ${pkgId} is on the known malicious contracts list`
        };
      }
    }
  }

  // Check whitelist
  let allWhitelisted = true;
  for (const pkgId of packageIds) {
    const normalized = pkgId.toLowerCase();
    const isWhitelisted = WHITELISTED_PACKAGES.some(
      safe => normalized.includes(safe.toLowerCase()) || normalized === safe.toLowerCase()
    );
    
    if (!isWhitelisted) {
      allWhitelisted = false;
      break;
    }
  }

  if (allWhitelisted && packageIds.length > 0) {
    return {
      status: 'SAFE',
      reason: 'All packages are verified safe Sui framework contracts'
    };
  }

  return {
    status: 'UNKNOWN',
    reason: 'Packages not in whitelist or blacklist - requires AI analysis'
  };
}
