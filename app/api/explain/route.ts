import { NextRequest, NextResponse } from 'next/server';
import { SuiSimulator } from '@/lib/simulator';
import { RiskEngine } from '@/lib/risk-engine';
import { GeminiExplainer } from '@/lib/gemini-explainer';
import { validateTransactionInput, validateNetwork, sanitizeUserIntent } from '@/lib/validation';
import { parseTransactionBytes } from '@/lib/sui-parser';
import { analytics } from '@/lib/analytics';

export async function POST(request: NextRequest) {
  try {
    const { transactionBytes, network, userAddress, userIntent } = await request.json();

    // Validate and sanitize inputs
    const txValidation = validateTransactionInput(transactionBytes);
    if (!txValidation.valid) {
      return NextResponse.json(
        { error: txValidation.error },
        { status: 400 }
      );
    }

    const networkValidation = validateNetwork(network);
    if (!networkValidation.valid) {
      return NextResponse.json(
        { error: networkValidation.error },
        { status: 400 }
      );
    }

    const sanitizedIntent = sanitizeUserIntent(userIntent);

    const simulator = new SuiSimulator();
    let txBytes = transactionBytes.trim();

    // If input is a hash, fetch the transaction bytes
    if (txValidation.isHash) {
      try {
        txBytes = await simulator.fetchTransactionBytes(txBytes, networkValidation.network!);
      } catch (error: any) {
        return NextResponse.json(
          { error: 'Sui Node Error: Failed to fetch transaction', details: error.message },
          { status: 502 }
        );
      }
    }

    // Static analysis (no RPC needed)
    const staticAnalysis = parseTransactionBytes(txBytes, networkValidation.network);

    // Run simulation
    let simulation;
    try {
      simulation = await simulator.simulate(
        txBytes,
        networkValidation.network!,
        userAddress
      );
    } catch (error: any) {
      return NextResponse.json(
        { error: 'Sui Node Error: Simulation failed', details: error.message },
        { status: 502 }
      );
    }

    // Analyze risk
    const riskEngine = new RiskEngine();
    const risk = riskEngine.analyze(simulation.effectsSummary, sanitizedIntent);

    // Track analytics
    analytics.increment('totalScans');
    if (risk.riskLevel === 'RED') {
      analytics.increment('scamsBlocked');
      // Estimate value protected from balance changes
      const outgoingValue = simulation.effectsSummary.balanceChanges
        .filter(c => c.type === 'decrease' && c.owner === 'you')
        .reduce((sum, c) => sum + (parseInt(c.amount) / 1_000_000_000), 0);
      if (outgoingValue > 0) analytics.addValueProtected(outgoingValue);
    }

    // Generate explanation
    const explainer = new GeminiExplainer();
    const explanation = await explainer.explain(simulation.effectsSummary, risk, sanitizedIntent);

    return NextResponse.json({
      simulation: {
        ...simulation,
        staticAnalysis
      },
      risk,
      explanation
    });

  } catch (error: any) {
    console.error('Explanation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Explanation failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}