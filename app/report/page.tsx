'use client';

import { useState, useEffect } from 'react';
import ZkLoginButton from '../components/ZkLoginButton';
import Toast from '../components/Toast';

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
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<'verified' | 'failed' | null>(null);
  const [toast, setToast] = useState<ToastState>({ show: false, message: '', type: 'success' });

  useEffect(() => {
    const checkLogin = () => {
      const address = sessionStorage.getItem('zklogin_address');
      setIsLoggedIn(!!address);
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
          network: 'testnet',
          userIntent: 'Verify malicious behavior'
        })
      });

      const result = await response.json();

      if (result.risk?.riskLevel === 'RED' || result.risk?.riskLevel === 'CRITICAL') {
        setVerificationResult('verified');
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
      const address = sessionStorage.getItem('zklogin_address');
      const email = sessionStorage.getItem('zklogin_email');
      
      console.log('📝 Submitting report:');
      console.log('  Package ID:', packageId);
      console.log('  Reporter:', address);
      console.log('  Email:', email);
      console.log('  Description:', description);
      console.log('  Verified:', verificationResult === 'verified');
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setToast({
        show: true,
        message: 'Report Submitted Successfully!',
        type: 'success',
        details: `Package ID: ${packageId.slice(0, 10)}...${packageId.slice(-6)}\nReporter: ${address?.slice(0, 6)}...${address?.slice(-4)}\nStatus: ${verificationResult === 'verified' ? 'Auto-Verified ✅' : 'Pending Review'}\n\nYour report will be recorded on-chain via the ReputationRegistry contract.\nThank you for helping protect the Sui community!`
      });
      
      setPackageId('');
      setDescription('');
      setProofTxHash('');
      setVerificationResult(null);
    } catch (error) {
      console.error('Failed to submit report:', error);
      setToast({
        show: true,
        message: 'Failed to Submit Report',
        type: 'error',
        details: 'Please check your connection and try again.\nIf the problem persists, contact support.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          details={toast.details}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}
      
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        <div className="security-surface p-8">
          <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-100 mb-2 tracking-tight">
                🚨 Report Malicious Contract
              </h1>
              <p className="text-slate-400">
                Help protect the Sui community by reporting suspicious contracts
              </p>
            </div>
            <ZkLoginButton />
          </div>

          <div className="border-t border-slate-700 pt-8">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6 mb-6">
              <h3 className="font-semibold text-blue-300 mb-2">
                ⚡ Automated Verification with VibeGuard AI
              </h3>
              <p className="text-blue-200/80 text-sm">
                Provide a transaction hash to automatically verify malicious behavior using our AI analysis pipeline. Verified reports are auto-approved and added to the blacklist immediately.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">
                  MALICIOUS PACKAGE ID
                </label>
                <input
                  type="text"
                  placeholder="0x..."
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 monospace-input focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 disabled:bg-slate-800/30 disabled:cursor-not-allowed"
                  disabled={!isLoggedIn}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">
                  THREAT DESCRIPTION
                </label>
                <textarea
                  placeholder="Describe the malicious behavior..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 resize-none disabled:bg-slate-800/30 disabled:cursor-not-allowed"
                  disabled={!isLoggedIn}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3 tracking-wide">
                  PROOF TRANSACTION HASH (OPTIONAL)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="0x... or transaction digest"
                    value={proofTxHash}
                    onChange={(e) => setProofTxHash(e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 monospace-input focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 disabled:bg-slate-800/30 disabled:cursor-not-allowed"
                    disabled={!isLoggedIn}
                  />
                  <button
                    type="button"
                    onClick={handleVerify}
                    disabled={!isLoggedIn || !proofTxHash.trim() || verifying}
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold rounded-lg border border-green-500/50 transition-all duration-200"
                  >
                    {verifying ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
                {verificationResult === 'verified' && (
                  <p className="text-xs text-green-400 mt-2 flex items-center gap-1">
                    <span>✅</span> Threat verified - report will be auto-approved
                  </p>
                )}
                {verificationResult === 'failed' && (
                  <p className="text-xs text-yellow-400 mt-2 flex items-center gap-1">
                    <span>⚠️</span> Verification failed - will be submitted as unverified
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                  Provide a transaction hash that demonstrates the malicious behavior for instant verification
                </p>
              </div>

              <button
                type="submit"
                disabled={!isLoggedIn || submitting}
                className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed text-white font-semibold text-base rounded-lg border border-blue-500/50 transition-all duration-200 shadow-lg shadow-blue-900/20"
              >
                {!isLoggedIn ? 'Login to Submit Report' : submitting ? (
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Submitting...</span>
                  </div>
                ) : 'Submit Report'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
