import { NextRequest, NextResponse } from 'next/server';
import { SuiSimulator } from '@/lib/simulator';
import { RiskEngine } from '@/lib/risk-engine';
import { GeminiExplainer } from '@/lib/gemini-explainer';
import { validateTransactionInput, validateNetwork, sanitizeUserIntent } from '@/lib/validation';
import { parseTransactionBytes } from '@/lib/sui-parser';
import { analytics } from '@/lib/analytics';
import { checkReputation } from '@/lib/reputation';

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

    // Reputation check - short-circuit if malicious
    const packageIds = staticAnalysis.moveCalls.map(call => call.packageId);
    const reputation = await checkReputation(packageIds, networkValidation.network!);

    if (reputation.status === 'MALICIOUS') {
      await analytics.increment('totalScans');
      await analytics.increment('scamsBlocked');
      
      return NextResponse.json({
        simulation: {
          rawDryRun: null,
          effectsSummary: {
            success: false,
            gasUsed: 0,
            balanceChanges: [],
            transfers: [],
            objectChanges: [],
            permissionChanges: [],
            uncertain: []
          },
          staticAnalysis
        },
        risk: {
          riskLevel: 'RED',
          reasons: [
            '⚠️ CRITICAL: Interacts with a known malicious smart contract',
            `Blacklisted package detected: ${reputation.matchedPackage}`
          ],
          confidence: 1.0
        },
        explanation: {
          headline: 'Malicious Contract Detected',
          plainEnglish: `This transaction attempts to interact with a known malicious smart contract (${reputation.matchedPackage}). This package has been flagged for scam activity. Do not sign this transaction under any circumstances.`,
          bulletPoints: [
            'Contract is on the malicious packages blacklist',
            'Likely phishing or honeypot scam',
            'Your assets are at extreme risk'
          ],
          recommendedAction: 'Do Not Sign',
          whatToCheck: [
            'Verify the source of this transaction request',
            'Report this to the Sui community',
            'Block the sender/dApp that provided this transaction'
          ]
        }
      });
    }

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
    await analytics.increment('totalScans');
    if (risk.riskLevel === 'RED') {
      await analytics.increment('scamsBlocked');
      const outgoingValue = simulation.effectsSummary.balanceChanges
        .filter(c => c.type === 'decrease' && c.owner === 'you')
        .reduce((sum, c) => sum + (parseInt(c.amount) / 1_000_000_000), 0);
      if (outgoingValue > 0) await analytics.addValueProtected(outgoingValue);
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