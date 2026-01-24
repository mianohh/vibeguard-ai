import { NextRequest, NextResponse } from 'next/server';
import { SuiSimulator } from '@/lib/simulator';
import { RiskEngine } from '@/lib/risk-engine';
import { validateTransactionInput, validateNetwork } from '@/lib/validation';

export async function POST(request: NextRequest) {
  try {
    const { transactionBytes, network, userAddress } = await request.json();

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

    // Run simulation
    const simulator = new SuiSimulator();
    const simulation = await simulator.simulate(
      transactionBytes.trim(),
      networkValidation.network!,
      userAddress
    );

    // Analyze risk
    const riskEngine = new RiskEngine();
    const risk = riskEngine.analyze(simulation.effectsSummary);

    return NextResponse.json({
      simulation,
      risk
    });

  } catch (error: any) {
    console.error('Analysis error:', error);
    
    return NextResponse.json(
      { 
        error: 'Analysis failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}