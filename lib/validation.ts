import { SuiNetwork } from '@/types';

export function validateTransactionInput(input: string): { valid: boolean; error?: string } {
  if (!input || typeof input !== 'string') {
    return { valid: false, error: 'Transaction input is required' };
  }

  const trimmed = input.trim();
  if (!trimmed) {
    return { valid: false, error: 'Transaction input cannot be empty' };
  }

  // Check if it's base64 encoded
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(trimmed)) {
    return { valid: false, error: 'Transaction must be base64-encoded bytes from a Sui wallet' };
  }

  // Try to decode to verify it's valid base64
  try {
    const decoded = Buffer.from(trimmed, 'base64');
    if (decoded.length === 0) {
      return { valid: false, error: 'Invalid base64 encoding' };
    }
  } catch (error) {
    return { valid: false, error: 'Invalid base64 encoding' };
  }

  return { valid: true };
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