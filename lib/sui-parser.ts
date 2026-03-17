import { Transaction } from '@mysten/sui/transactions';

export interface MoveCallTarget {
  packageId: string;
  moduleName: string;
  functionName: string;
}

export interface StaticAnalysis {
  moveCalls: MoveCallTarget[];
  gasBudget?: string;
  isHighGas: boolean;
  containsDirectTransfer: boolean;
  chainId?: string;
  networkMismatch: boolean;
}

const NETWORK_CHAIN_IDS: Record<string, string> = {
  mainnet: '35834a8a',
  testnet: '4c78adac',
  devnet: 'unknown'
};

export function parseTransactionBytes(base64Bytes: string, expectedNetwork?: string): StaticAnalysis {
  const tx = Transaction.from(base64Bytes);
  const txData = tx.getData();

  const moveCalls = extractMoveCalls(txData);
  const { gasBudget, isHighGas } = extractGasConfig(txData);
  const containsDirectTransfer = detectTransferOperations(txData);
  const { chainId, networkMismatch } = validateChainId(base64Bytes, expectedNetwork);

  return { moveCalls, gasBudget, isHighGas, containsDirectTransfer, chainId, networkMismatch };
}

function extractMoveCalls(txData: any): MoveCallTarget[] {
  const calls: MoveCallTarget[] = [];
  for (const tx of txData.commands ?? []) {
    if (tx.MoveCall) {
      const { package: pkg, module: mod, function: fn } = tx.MoveCall;
      calls.push({ packageId: pkg, moduleName: mod, functionName: fn });
    }
  }
  return calls;
}

function extractGasConfig(txData: any): { gasBudget?: string; isHighGas: boolean } {
  const budget = txData.gasData?.budget;
  if (!budget) return { isHighGas: false };
  const budgetNum = typeof budget === 'string' ? parseInt(budget) : Number(budget);
  return { gasBudget: budgetNum.toString(), isHighGas: budgetNum > 1_000_000_000 };
}

function detectTransferOperations(txData: any): boolean {
  for (const tx of txData.commands ?? []) {
    if (tx.TransferObjects || tx.SplitCoins) return true;
  }
  return false;
}

function validateChainId(base64Bytes: string, expectedNetwork?: string): { chainId?: string; networkMismatch: boolean } {
  try {
    const bytes = Buffer.from(base64Bytes, 'base64');
    const chainIdHex = bytes.slice(0, 4).toString('hex');
    if (!expectedNetwork) return { chainId: chainIdHex, networkMismatch: false };
    const expectedChainId = NETWORK_CHAIN_IDS[expectedNetwork];
    return { chainId: chainIdHex, networkMismatch: expectedChainId !== 'unknown' && chainIdHex !== expectedChainId };
  } catch {
    return { networkMismatch: false };
  }
}
