import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { SuiNetwork } from '@/types';

const WHITELISTED_PACKAGES = [
  '0x1', '0x2', '0x3',
  '0x0000000000000000000000000000000000000000000000000000000000000001',
  '0x0000000000000000000000000000000000000000000000000000000000000002',
  '0x0000000000000000000000000000000000000000000000000000000000000003',
  '0xdee9',
];

const BLACKLISTED_PACKAGES = [
  '0xbad1', '0xscam', '0xbad1c0ffee', '0xscam1234567890abcdef',
];

const REGISTRY_IDS: Record<SuiNetwork, string | null> = {
  testnet: '0x6d447256edfa7e8687eaf95324b5ac99a5969ecdaede1d6b3f8e27b14dca7ac3',
  mainnet: null,
  devnet: null,
};

export interface ReputationResult {
  status: 'SAFE' | 'MALICIOUS' | 'UNKNOWN';
  matchedPackage?: string;
  reason?: string;
  walrusBlobId?: string;
}

export async function checkReputation(packageIds: string[], network: SuiNetwork = 'testnet'): Promise<ReputationResult> {
  // Check whitelist first — no RPC needed
  const allWhitelisted = packageIds.length > 0 && packageIds.every(id =>
    WHITELISTED_PACKAGES.some(safe => id.toLowerCase() === safe.toLowerCase())
  );
  if (allWhitelisted) {
    return { status: 'SAFE', reason: 'All packages are verified safe Sui framework contracts' };
  }

  // Check local blacklist — immediate fail, no RPC needed
  for (const pkgId of packageIds) {
    const normalized = pkgId.toLowerCase();
    for (const blacklisted of BLACKLISTED_PACKAGES) {
      if (normalized === blacklisted.toLowerCase() || normalized.includes(blacklisted.toLowerCase())) {
        return { status: 'MALICIOUS', matchedPackage: pkgId, reason: `Package ${pkgId} is on the known malicious contracts list` };
      }
    }
  }

  // Query on-chain registry
  const registryId = REGISTRY_IDS[network];
  if (!registryId) {
    return { status: 'UNKNOWN', reason: 'No registry deployed on this network' };
  }

  const client = new SuiClient({ url: getFullnodeUrl(network) });

  for (const pkgId of packageIds) {
    try {
      const field = await client.getDynamicFieldObject({
        parentId: registryId,
        name: { type: 'address', value: pkgId }
      });

      if (field?.data) {
        const walrusBlobId = (field.data as any)?.content?.fields?.value as string | undefined;
        return {
          status: 'MALICIOUS',
          matchedPackage: pkgId,
          reason: `Package ${pkgId} is registered as malicious on-chain`,
          walrusBlobId
        };
      }
    } catch (rpcError: unknown) {
      const msg = rpcError instanceof Error ? rpcError.message : String(rpcError);
      // 404-style errors mean the package is not in the registry — that's expected
      if (!msg.includes('not found') && !msg.includes('does not exist') && !msg.includes('Cannot find')) {
        console.warn('[reputation] RPC error, falling back to local blacklist:', msg);
        return { status: 'UNKNOWN', reason: 'Registry query failed, proceeding with AI analysis' };
      }
    }
  }

  return { status: 'UNKNOWN', reason: 'Package not found in registry — requires AI analysis' };
}
