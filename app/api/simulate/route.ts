import { NextRequest, NextResponse } from 'next/server';
import { SuiSimulator } from '@/lib/simulator';
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

    const simulator = new SuiSimulator();
    let txBytes = transactionBytes.trim();

    // If input is a hash, fetch the transaction bytes
    if (txValidation.isHash) {
      txBytes = await simulator.fetchTransactionBytes(txBytes, networkValidation.network!);
    }

    // Run simulation
    const result = await simulator.simulate(
      txBytes,
      networkValidation.network!,
      userAddress
    );

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Simulation error:', error);
    
    return NextResponse.json(
      { 
        error: 'Simulation failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}