import { TransactionBlock } from '@mysten/sui.js/transactions';

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
  const txBlock = TransactionBlock.from(base64Bytes);
  
  const moveCalls = extractMoveCalls(txBlock);
  const { gasBudget, isHighGas } = extractGasConfig(txBlock);
  const containsDirectTransfer = detectTransferOperations(txBlock);
  const { chainId, networkMismatch } = validateChainId(base64Bytes, expectedNetwork);

  return {
    moveCalls,
    gasBudget,
    isHighGas,
    containsDirectTransfer,
    chainId,
    networkMismatch
  };
}

function extractMoveCalls(txBlock: TransactionBlock): MoveCallTarget[] {
  const calls: MoveCallTarget[] = [];
  const blockData = txBlock.blockData;

  for (const tx of blockData.transactions) {
    if (tx.kind === 'MoveCall') {
      calls.push({
        packageId: tx.target.split('::')[0],
        moduleName: tx.target.split('::')[1],
        functionName: tx.target.split('::')[2]
      });
    }
  }

  return calls;
}

function extractGasConfig(txBlock: TransactionBlock): { gasBudget?: string; isHighGas: boolean } {
  const gasConfig = txBlock.blockData.gasConfig;
  const budget = gasConfig.budget;
  
  if (!budget) {
    return { isHighGas: false };
  }

  const budgetNum = typeof budget === 'string' ? parseInt(budget) : Number(budget);
  const ONE_SUI = 1_000_000_000;
  
  return {
    gasBudget: budgetNum.toString(),
    isHighGas: budgetNum > ONE_SUI
  };
}

function detectTransferOperations(txBlock: TransactionBlock): boolean {
  const blockData = txBlock.blockData;

  for (const tx of blockData.transactions) {
    if (tx.kind === 'TransferObjects' || tx.kind === 'SplitCoins') {
      return true;
    }
  }

  return false;
}

function validateChainId(base64Bytes: string, expectedNetwork?: string): { chainId?: string; networkMismatch: boolean } {
  try {
    const bytes = Buffer.from(base64Bytes, 'base64');
    const chainIdHex = bytes.slice(0, 4).toString('hex');
    
    if (!expectedNetwork) {
      return { chainId: chainIdHex, networkMismatch: false };
    }

    const expectedChainId = NETWORK_CHAIN_IDS[expectedNetwork];
    const mismatch = expectedChainId !== 'unknown' && chainIdHex !== expectedChainId;

    return {
      chainId: chainIdHex,
      networkMismatch: mismatch
    };
  } catch {
    return { networkMismatch: false };
  }
}
