import { NextRequest, NextResponse } from 'next/server';
import { SuiSimulator } from '@/lib/simulator';
import { RiskEngine } from '@/lib/risk-engine';
import { LocalThreatAgent } from '@/lib/local-threat-agent';
import { validateTransactionInput, validateNetwork, sanitizeUserIntent } from '@/lib/validation';
import { parseTransactionBytes } from '@/lib/sui-parser';
import { analytics } from '@/lib/analytics';
import { checkReputation } from '@/lib/reputation';
import { autoReportThreat } from '@/lib/auto-reporter';
import { BackgroundQueue } from '@/lib/background-queue';
import { rateLimit, getRateLimitHeaders } from '@/lib/rate-limit';
import { sendTelegramAlert } from '@/lib/alerting';

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  const ip = request.headers.get('x-forwarded-for') || 'anonymous';
  const rl = rateLimit(ip, 30, 60000);

  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Max 30 requests per minute.' },
      { status: 429, headers: getRateLimitHeaders(rl) }
    );
  }

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

      // Auto-report: prefer external Move package ID, fall back to raw drain recipient from dryRun
      const externalPackageId = staticAnalysis.moveCalls
        .map(c => c.packageId)
        .find(id => id && id !== '0x1' && id !== '0x2' && id !== '0x3');

      const rawBalanceChanges = simulation.rawDryRun?.balanceChanges || [];
      const drainRecipient = rawBalanceChanges
        .filter((c: any) => parseInt(c.amount) > 0)
        .map((c: any) => c.owner?.AddressOwner)
        .find((addr: string) => addr && addr !== userAddress);

      const maliciousPackageId = externalPackageId ?? drainRecipient;

      if (maliciousPackageId) {
        BackgroundQueue.enqueue(request, {
          name: 'auto-report-threat',
          execute: () => autoReportThreat(maliciousPackageId, risk.reasons),
        });
      }
    }

    // Generate explanation using local threat agent
    const agentStartTime = performance.now();
    const localAgent = new LocalThreatAgent();
    const explanation = await localAgent.analyze(simulation.effectsSummary, risk, sanitizedIntent);
    const agentDuration = performance.now() - agentStartTime;

    // Latency monitoring - alert if LocalThreatAgent is slow
    if (agentDuration > 2500) {
      sendTelegramAlert(
        `⚠️ <b>Latency Warning: Threat detection took ${Math.round(agentDuration)}ms</b>\n\n` +
        `Threshold: 2500ms\n` +
        `Network: ${networkValidation.network}\n` +
        `Risk Level: ${risk.riskLevel}`
      ).catch(() => {}); // Non-blocking
    }

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
    console.log('🚨 Attempting to send Telegram alert...');
    
    // Critical failure alert
    await sendTelegramAlert(
      `🚨 <b>API Critical Failure</b>\n\n` +
      `Error: ${error.message}\n` +
      `Stack: ${error.stack?.split('\n')[0] || 'N/A'}\n` +
      `Timestamp: ${new Date().toISOString()}`
    );
    
    console.log('✅ Telegram alert sent');
    
    return NextResponse.json(
      { 
        error: 'Explanation failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}