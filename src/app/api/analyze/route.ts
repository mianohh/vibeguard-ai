import { NextRequest, NextResponse } from 'next/server';
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';

const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });

interface AnalysisResult {
  summary: string;
  riskScore: 'SAFE' | 'CAUTION' | 'DANGER';
  reasoning: string;
}

function formatAmount(amount: string, coinType: string): string {
  const value = Math.abs(parseFloat(amount));
  
  if (coinType === '0x2::sui::SUI') {
    return `${(value / 1_000_000_000).toFixed(4)} SUI`;
  }
  
  // Extract token name from coin type
  const tokenName = coinType.split('::').pop()?.toUpperCase() || 'TOKEN';
  return `${(value / 1_000_000_000).toFixed(4)} ${tokenName}`;
}

function generateHumanReadableSummary(dryRunResult: any): AnalysisResult {
  const balanceChanges = dryRunResult.balanceChanges || [];
  const objectChanges = dryRunResult.objectChanges || [];
  
  // Separate positive and negative balance changes (excluding gas)
  const outgoing = balanceChanges.filter((change: any) => 
    parseFloat(change.amount) < 0 && change.coinType !== '0x2::sui::SUI'
  );
  const incoming = balanceChanges.filter((change: any) => 
    parseFloat(change.amount) > 0
  );
  const gasChange = balanceChanges.find((change: any) => 
    change.coinType === '0x2::sui::SUI' && parseFloat(change.amount) < 0
  );
  
  // Check for NFT activity
  const nftActivity = objectChanges.some((change: any) => 
    change.type === 'created' || change.type === 'transferred'
  );
  
  // Scenario D: NFT Activity
  if (nftActivity) {
    return {
      summary: "This transaction involves transferring or creating an NFT object",
      riskScore: "CAUTION",
      reasoning: "NFT transactions require careful verification of object ownership"
    };
  }
  
  // Scenario C: Gas Only (Contract Interaction)
  if (outgoing.length === 0 && incoming.length === 0) {
    return {
      summary: "You are interacting with a contract. No assets are leaving your wallet besides a small gas fee",
      riskScore: "SAFE",
      reasoning: "Standard contract interaction with only gas payment"
    };
  }
  
  // Scenario B: Drain/Transfer (Assets Out Only)
  if (outgoing.length > 0 && incoming.length === 0) {
    const firstOut = outgoing[0];
    const amount = formatAmount(firstOut.amount, firstOut.coinType);
    
    return {
      summary: `WARNING: You are sending ${amount} to another address and receiving nothing in return`,
      riskScore: "DANGER",
      reasoning: "Assets are leaving wallet without compensation"
    };
  }
  
  // Scenario A: Swap (Assets In & Out)
  if (outgoing.length > 0 && incoming.length > 0) {
    const firstOut = outgoing[0];
    const firstIn = incoming[0];
    const outAmount = formatAmount(firstOut.amount, firstOut.coinType);
    const inAmount = formatAmount(firstIn.amount, firstIn.coinType);
    
    return {
      summary: `You are swapping ${outAmount} to receive approximately ${inAmount}`,
      riskScore: "SAFE",
      reasoning: "Standard asset exchange with balanced trade"
    };
  }
  
  // Scenario A (Receiving Only)
  if (outgoing.length === 0 && incoming.length > 0) {
    const firstIn = incoming[0];
    const inAmount = formatAmount(firstIn.amount, firstIn.coinType);
    
    return {
      summary: `You are receiving ${inAmount} from another address`,
      riskScore: "SAFE",
      reasoning: "Incoming assets with no outgoing transfers"
    };
  }
  
  // Default fallback
  return {
    summary: "Transaction involves contract interaction with unclear asset movements",
    riskScore: "CAUTION",
    reasoning: "Unable to determine exact nature of transaction"
  };
}

export async function POST(request: NextRequest) {
  try {
    const { transactionBlock, digest } = await request.json();

    let dryRunResult;

    if (digest) {
      // Analyze executed transaction by digest
      const txData = await suiClient.getTransactionBlock({
        digest,
        options: {
          showInput: true,
          showEffects: true,
          showBalanceChanges: true,
          showEvents: true,
          showObjectChanges: true
        }
      });
      
      dryRunResult = {
        balanceChanges: txData.balanceChanges || [],
        objectChanges: txData.objectChanges || [],
        effects: txData.effects,
        events: txData.events || []
      };
    } else if (transactionBlock) {
      // Dry run transaction block
      dryRunResult = await suiClient.dryRunTransactionBlock({
        transactionBlock,
      });
    } else {
      return NextResponse.json(
        { error: 'Either transactionBlock or digest is required' },
        { status: 400 }
      );
    }

    // Generate human-readable analysis
    const analysis = generateHumanReadableSummary(dryRunResult);

    return NextResponse.json({
      success: true,
      analysis,
      transactionData: dryRunResult,
    });

  } catch (error) {
    console.error('Analysis error:', error);
    
    return NextResponse.json(
      { error: 'Failed to analyze transaction' },
      { status: 500 }
    );
  }
}