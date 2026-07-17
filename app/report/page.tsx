'use client';

import { useState, useEffect } from 'react';
import ZkLoginButton from '../components/ZkLoginButton';
import Toast from '../components/Toast';
import { publishThreatReportToWalrus, type ThreatReport } from '@/lib/walrus';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
  details?: string;
}

export default function ReportPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [packageId, setPackageId] = useState('');
  const [description, setDescription] = useState('');
  const [proofTxHash, setProofTxHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingStage, setLoadingStage] = useState<string>('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'verified' | 'failed' | null>(null);
  const [verificationData, setVerificationData] = useState<any>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    const checkLogin = () => {
      const zkLoginBurnerSession = sessionStorage.getItem('zklogin_burner_session');
      const burnerAddress = sessionStorage.getItem('burner_address');
      setIsLoggedIn(!!(zkLoginBurnerSession && burnerAddress));
    };

    checkLogin();
    const interval = setInterval(checkLogin, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = async () => {
    if (!proofTxHash.trim()) return;

    setVerifying(true);
    setVerificationResult(null);

    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionBytes: proofTxHash,
          network: 'devnet',
          userIntent: 'Verify malicious behavior'
        })
      });

      const result = await response.json();

      if (result.risk?.riskLevel === 'RED' || result.risk?.riskLevel === 'CRITICAL') {
        setVerificationResult('verified');
        setVerificationData(result);
        setToast({
          show: true,
          message: 'Threat Verified!',
          type: 'success',
          details: `Analysis confirmed malicious behavior:\n${result.explanation?.headline || 'High-risk transaction detected'}`
        });
      } else {
        setVerificationResult('failed');
        setToast({
          show: true,
          message: 'Verification Failed',
          type: 'error',
          details: 'Transaction did not show malicious behavior. Submit as unverified report.'
        });
      }
    } catch (error) {
      setToast({
        show: true,
        message: 'Verification Error',
        type: 'error',
        details: 'Failed to analyze transaction. You can still submit as unverified.'
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!packageId || !description) {
      alert('Please fill in all fields');
      return;
    }

    setSubmitting(true);

    try {
      const secretKeyBase64 = sessionStorage.getItem('burner_secret_key');
      const zkLoginBurnerSession = sessionStorage.getItem('zklogin_burner_session');

      if (!secretKeyBase64) {
        throw new Error('Please authenticate with zkLogin Burner Wallet first.');
      }

      let sessionInfo = { reportedBy: 'anonymous' };
      if (zkLoginBurnerSession) {
        const session = JSON.parse(zkLoginBurnerSession);
        sessionInfo.reportedBy = `${session.email} (${session.zkLoginAddress})`;
      }

      const secretKeyBytes = Buffer.from(secretKeyBase64, 'base64');
      const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(new Uint8Array(secretKeyBytes));
      const userAddress = ephemeralKeyPair.toSuiAddress();

      const threatReport: ThreatReport = {
        packageId,
        transactionBytes: proofTxHash || undefined,
        userIntent: 'Report malicious contract',
        riskLevel: verificationData?.risk?.riskLevel || 'UNVERIFIED',
        reasons: verificationData?.risk?.reasons || [description],
        headline: verificationData?.explanation?.headline || 'Community-Reported Threat',
        plainEnglish: verificationData?.explanation?.plainEnglish || description,
        recommendedAction: verificationData?.explanation?.recommendedAction || 'Do Not Sign',
        reportedAt: new Date().toISOString(),
        reportedBy: sessionInfo.reportedBy
      };

      setLoadingStage('Uploading threat evidence to Walrus decentralized storage...');
      let walrusBlobId: string;
      let walrusBlobObjectId: string;

      try {
        const walrusResult = await publishThreatReportToWalrus(threatReport);
        walrusBlobId = walrusResult.blobId;
        walrusBlobObjectId = walrusResult.blobObjectId;
      } catch (walrusError) {
        console.error('Walrus upload failed:', walrusError);
        // Do not proceed with fake blob ID - it would poison the on-chain registry
        throw new Error(`Walrus upload failed: ${walrusError instanceof Error ? walrusError.message : 'Unknown error'}. Cannot proceed without valid blob storage.`);
      }

      if (!walrusBlobId) {
        throw new Error('Failed to generate blob ID');
      }

      setLoadingStage('Requesting gas sponsorship...');

      const sponsorPayload = {
        packageId: process.env.NEXT_PUBLIC_PACKAGE_ID || '0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de',
        registryId: process.env.NEXT_PUBLIC_REGISTRY_ID || '0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be',
        maliciousPackageId: packageId,
        walrusBlobId,
        blobObjectId: walrusBlobObjectId,
        sender: userAddress
      };

      const sponsorResponse = await fetch('/api/sponsor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sponsorPayload),
      });

      if (!sponsorResponse.ok) {
        const errorData = await sponsorResponse.json();
        throw new Error(errorData.error || 'Failed to get sponsor signature');
      }

      const { txBytes: sponsoredTxBytes, sponsorSignature } = await sponsorResponse.json();

      setLoadingStage('Signing with burner wallet...');

      const { fromBase64 } = await import('@mysten/sui/utils');
      const txBytesUint8Array = fromBase64(sponsoredTxBytes);
      const { signature: userSignature } = await ephemeralKeyPair.signTransaction(txBytesUint8Array);

      setLoadingStage('Executing gasless transaction...');

      const result = await client.executeTransactionBlock({
        transactionBlock: txBytesUint8Array,
        signature: [userSignature, sponsorSignature],
        options: {
          showEffects: true,
          showObjectChanges: true,
          showEvents: true,
        },
      });

      if (result.effects?.status?.status !== 'success') {
        throw new Error(`Transaction failed: ${result.effects?.status?.error || 'Unknown error'}`);
      }

      setToast({
        show: true,
        message: 'Report Submitted Successfully!',
        type: 'success',
        details: `Transaction: ${result.digest}\nPackage: ${packageId}\nWalrus Blob: ${walrusBlobId}`
      });

      setPackageId('');
      setDescription('');
      setProofTxHash('');
      setVerificationResult(null);
      setVerificationData(null);

    } catch (error) {
      console.error('Failed to submit report:', error);
      setToast({
        show: true,
        message: 'Failed to Submit Report',
        type: 'error',
        details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nPlease check your connection and try again.\nIf the problem persists, contact support.`
      });
    } finally {
      setSubmitting(false);
      setLoadingStage('');
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="ocean-background" />
      <div className="purple-section-blur" />

      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          details={toast.details}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      <div className="relative z-10 container mx-auto px-4 py-6 lg:py-10 max-w-5xl section-divider">
        <div className="glass-card p-4 sm:p-6 lg:p-8 liquid-expand">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 lg:mb-8 flex-wrap gap-4">
            <div>
              <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Community Protection</p>
              <div className="flex items-center gap-3 mb-2">
                <svg className="w-8 h-8 text-status-danger" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <h1 className="text-3xl font-bold text-white tracking-tight">
                  Report Malicious Contract
                </h1>
              </div>
              <p className="text-lightblue">
                Help protect the Sui community by reporting suspicious contracts
              </p>
            </div>
            <ZkLoginButton />
          </div>

          <div className="border-t border-ocean-surface pt-8">
            <div className="glass-card bg-sui-blue/10 border border-white/10 p-6 mb-6">
              <p className="text-primary text-xs font-semibold uppercase tracking-wider mb-2">AI Analysis Pipeline</p>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-sui-cyan" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" />
                </svg>
                <h3 className="font-semibold text-primary">
                  Automated Verification with VibeGuard AI
                </h3>
              </div>
              <p className="text-sui-aqua/80 text-sm">
                Provide a transaction hash to automatically verify malicious behavior using our AI analysis pipeline. Verified reports are auto-approved and added to the blacklist immediately.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-primary mb-3 tracking-wide">
                  MALICIOUS PACKAGE ID
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value)}
                  className="w-full px-4 py-3 bg-ocean-mid/50 border border-ocean-surface rounded-lg text-gray-200 placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sui-cyan/50 focus:border-sui-cyan transition-all duration-200 disabled:bg-ocean-surface/30 disabled:cursor-not-allowed"
                  disabled={!isLoggedIn}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-3 tracking-wide">
                  THREAT DESCRIPTION
                </label>
                <textarea
                  placeholder="Describe the malicious behavior..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-ocean-mid/50 border border-ocean-surface rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sui-cyan/50 focus:border-sui-cyan transition-all duration-200 resize-none disabled:bg-ocean-surface/30 disabled:cursor-not-allowed"
                  disabled={!isLoggedIn}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary mb-3 tracking-wide">
                  PROOF TRANSACTION HASH (OPTIONAL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="0x... or transaction digest"
                    value={proofTxHash}
                    onChange={(e) => setProofTxHash(e.target.value)}
                    className="flex-1 px-4 py-3 bg-ocean-mid/50 border border-ocean-surface rounded-lg text-gray-200 placeholder-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-sui-cyan/50 focus:border-sui-cyan transition-all duration-200 disabled:bg-ocean-surface/30 disabled:cursor-not-allowed"
                    disabled={!isLoggedIn}
                  />
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={!isLoggedIn || !proofTxHash.trim() || verifying}
                    className="px-6 py-3 bg-status-safe hover:bg-status-safe/80 disabled:bg-ocean-surface disabled:text-gray-500 disabled:cursor-not-allowed text-ocean-deepest font-semibold rounded-lg border border-white/10 transition-all duration-200 shadow-verified"
                  >
                    {verifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
                {verificationResult === 'verified' && (
                  <p className="text-xs text-status-safe mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Threat verified - report will be auto-approved
                  </p>
                )}
                {verificationResult === 'failed' && (
                  <p className="text-xs text-status-warning mt-2 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Verification failed - will be submitted as unverified
                  </p>
                )}
                <p className="text-xs text-lightblue mt-2 leading-relaxed">
                  Provide a transaction hash that demonstrates the malicious behavior for instant verification
                </p>
              </div>

              <button
                type="submit"
                disabled={!isLoggedIn || submitting}
                className="btn-purple w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="relative z-10">
                  {!isLoggedIn ? 'Login to Submit Report' : submitting ? (
                    <div className="flex items-center justify-center space-x-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{loadingStage || 'Submitting...'}</span>
                    </div>
                  ) : 'Submit Report'}
                </span>
              </button>

              <div className="text-center text-xs text-lightblue mt-4">
                Powered by <span className="text-primary font-semibold">Google OAuth</span> & <span className="text-primary font-semibold">Walrus Decentralized Storage</span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
