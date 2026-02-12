import { SuiNetwork } from '@/types';

// Regex validators
const SUI_ADDRESS_REGEX = /^0x[a-fA-F0-9]{64}$/;
const BASE64_REGEX = /^[A-Za-z0-9+/]{4,}={0,2}$/;

export function validateSuiAddress(address: string): boolean {
  return SUI_ADDRESS_REGEX.test(address.trim());
}

export function validateBase64(input: string): boolean {
  const trimmed = input.trim();
  if (!BASE64_REGEX.test(trimmed)) return false;
  try {
    return Buffer.from(trimmed, 'base64').length > 0;
  } catch {
    return false;
  }
}

export function sanitizeUserIntent(intent: string | undefined): string {
  if (!intent || typeof intent !== 'string') return '';
  return intent.trim().replace(/[<>"'`\\]/g, '').slice(0, 500);
}

export function validateTransactionInput(input: string): { valid: boolean; error?: string; isHash?: boolean } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Transaction input is required' };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: 'Transaction input cannot be empty' };
  }

  if (validateSuiAddress(trimmed)) {
    return { valid: true, isHash: true };
  }

  if (validateBase64(trimmed)) {
    return { valid: true, isHash: false };
  }

  return { valid: false, error: 'Transaction must be a hash (0x...) or base64-encoded bytes' };
}

export function validateNetwork(network: string): { valid: boolean; error?: string; network?: SuiNetwork } {
  if (!network || typeof network !== 'string') {
    return { valid: false, error: 'Network selection is required' };
  }

  const validNetworks: SuiNetwork[] = ['mainnet', 'testnet', 'devnet'];
  const normalizedNetwork = network.toLowerCase() as SuiNetwork;

  if (!validNetworks.includes(normalizedNetwork)) {
    return { valid: false, error: 'Network must be mainnet, testnet, or devnet' };
  }

  return { valid: true, network: normalizedNetwork };
}