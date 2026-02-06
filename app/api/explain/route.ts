import { NextRequest, NextResponse } from 'next/server';
import { SuiSimulator } from '@/lib/simulator';
import { RiskEngine } from '@/lib/risk-engine';
import { GeminiExplainer } from '@/lib/gemini-explainer';
import { validateTransactionInput, validateNetwork } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const { transactionBytes, network, userAddress, userIntent } = await request.json();

    // Validate inputs
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

    const simulator = new SuiSimulator();
    let txBytes = transactionBytes.trim();

    // If input is a hash, fetch the transaction bytes
    if (txValidation.isHash) {
      txBytes = await simulator.fetchTransactionBytes(txBytes, networkValidation.network!);
    }

    // Run simulation
    const simulation = await simulator.simulate(
      txBytes,
      networkValidation.network!,
      userAddress
    );

    // Analyze risk
    const riskEngine = new RiskEngine();
    const risk = riskEngine.analyze(simulation.effectsSummary, userIntent);

    // Generate explanation
    const explainer = new GeminiExplainer();
    const explanation = await explainer.explain(simulation.effectsSummary, risk, userIntent);

    return NextResponse.json({
      simulation,
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