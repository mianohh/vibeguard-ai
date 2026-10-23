'use client';

import { useState, useEffect } from 'react';
import ZkLoginButton from '../components/ZkLoginButton';
import Toast from '../components/Toast';
import { publishThreatReportToWalrus, type ThreatReport } from '@/lib/walrus';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { CircleCheck, Info, Loader2, Send, ShieldCheck, TriangleAlert } from 'lucide-react';
import Field, { inputClass } from '@/app/components/ui/Field';
import Button from '@/app/components/ui/Button';
import Card from '@/app/components/ui/Card';
import VerdictBanner from '@/app/components/ui/VerdictBanner';
import SectionHeading from '@/app/components/ui/SectionHeading';

interface ToastState {
  show: boolean;
  message: string;
  type: 'success' | 'error';
  details?: string;
}

const steps = [
  { n: '01', label: 'Describe the scam' },
  { n: '02', label: 'Verify proof (optional)' },
  { n: '03', label: 'Submit gasless' },
];

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
  const [formError, setFormError] = useState<string | null>(null);
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
          network: 'testnet',
          userIntent: 'Verify malicious behavior',
        }),
      });

      const result = await response.json();

      if (result.risk?.riskLevel === 'RED' || result.risk?.riskLevel === 'CRITICAL') {
        setVerificationResult('verified');
        setVerificationData(result);
        setToast({
          show: true,
          message: 'Threat verified',
          type: 'success',
          details: `${result.explanation?.headline || 'High-risk transaction detected'}`,
        });
      } else {
        setVerificationResult('failed');
        setToast({
          show: true,
          message: 'Verification failed',
          type: 'error',
          details: 'Transaction did not show malicious behavior. You can still submit as unverified.',
        });
      }
    } catch (error) {
      setToast({
        show: true,
        message: 'Verification error',
        type: 'error',
        details: 'Failed to analyze transaction. You can still submit as unverified.',
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!packageId || !description) {
      setFormError('Add the package ID and a short description of the scam so others can recognize it.');
      return;
    }

    setFormError(null);
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
        reportedBy: sessionInfo.reportedBy,
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
        throw new Error(
          `Walrus upload failed: ${walrusError instanceof Error ? walrusError.message : 'Unknown error'}. Cannot proceed without valid blob storage.`
        );
      }

      if (!walrusBlobId) {
        throw new Error('Failed to generate blob ID');
      }

      setLoadingStage('Requesting gas sponsorship...');

      const sponsorPayload = {
        packageId: process.env.PACKAGE_ID || '0xa706a721c2e2684834fd60623ad87ee43be42e241cffb038edd70fb527b494de',
        registryId: process.env.REGISTRY_ID || '0xf172e861476e122ae699384b95b99591f30b53c5f97f9384e4d1bad5aa6495be',
        maliciousPackageId: packageId,
        walrusBlobId,
        blobObjectId: walrusBlobObjectId,
        sender: userAddress,
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

      const executeResponse = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionBlock: sponsoredTxBytes,
          signature: [userSignature, sponsorSignature],
          network: 'testnet',
        }),
      });
      const result = await executeResponse.json();

      if (!executeResponse.ok || result.effects?.status?.status !== 'success') {
        throw new Error(`Transaction failed: ${result.error || result.effects?.status?.error || 'Unknown error'}`);
      }

      setToast({
        show: true,
        message: 'Report submitted',
        type: 'success',
        details: `tx: ${result.digest}\npackage: ${packageId}\nblob: ${walrusBlobId}`,
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
        message: 'Failed to submit report',
        type: 'error',
        details: `${error instanceof Error ? error.message : 'Unknown error'}\n\nCheck your connection and try again.`,
      });
    } finally {
      setSubmitting(false);
      setLoadingStage('');
    }
  };

  const activeStep = !packageId || !description ? 0 : verificationResult === null ? 1 : 2;

  return (
    <div className="shell py-10 lg:py-14 max-w-5xl">
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          details={toast.details}
          onClose={() => setToast({ ...toast, show: false })}
        />
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5 mb-9">
        <SectionHeading
          kicker="Community protection"
          title="Report a malicious contract"
          lede="Under a minute. Gas is covered, evidence is stored on Walrus, and every verified claim is independently checkable on Sui."
        />
        <div className="flex-shrink-0 pt-1">
          <ZkLoginButton />
        </div>
      </div>

      <ol className="flex flex-wrap gap-x-6 gap-y-2 mb-7 font-mono text-[11.5px] uppercase tracking-[0.1em]">
        {steps.map((s, i) => (
          <li
            key={s.n}
            className={`flex items-center gap-2 ${i <= activeStep ? 'text-sui' : 'text-faint'}`}
          >
            <span
              className={`w-5 h-5 rounded-full grid place-items-center text-[10px] border ${
                i <= activeStep ? 'bg-sui/15 border-sui/50 text-sui' : 'border-line text-faint'
              }`}
            >
              {i < activeStep ? '✓' : s.n}
            </span>
            {s.label}
          </li>
        ))}
      </ol>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6 items-start">
        <form onSubmit={handleSubmit} className="surface p-5 sm:p-7 space-y-6 animate-fade-up">
          <Field label="Malicious package ID" htmlFor="report-package-id" required error={formError ?? undefined}>
            <input
              id="report-package-id"
              type="text"
              placeholder="0x…"
              value={packageId}
              onChange={(e) => setPackageId(e.target.value)}
              className={inputClass}
              disabled={!isLoggedIn}
            />
          </Field>

          <Field
            label="What does this scam do?"
            htmlFor="report-description"
            required
            hint="Plain language. The next visitor reads this to recognize the scam."
          >
            <textarea
              id="report-description"
              placeholder="e.g. Fakes an airdrop claim, then drains your wallet via a hidden permission grant…"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#070c16] border border-line rounded-[var(--radius-ctl)] text-hi placeholder:text-faint text-sm px-3.5 py-3 transition-colors focus:outline-none focus:border-sui/60 focus:ring-2 focus:ring-sui/25 disabled:opacity-50 disabled:cursor-not-allowed resize-none leading-relaxed"
              disabled={!isLoggedIn}
            />
          </Field>

          <Field
            label="Proof transaction (optional)"
            htmlFor="report-proof-tx"
            hint="A RED verdict from this transaction auto-verifies the report."
          >
            <div className="flex gap-2.5">
              <input
                id="report-proof-tx"
                type="text"
                placeholder="0x… or transaction digest"
                value={proofTxHash}
                onChange={(e) => setProofTxHash(e.target.value)}
                className={`${inputClass} flex-1`}
                disabled={!isLoggedIn}
              />
              <Button
                variant="secondary"
                size="md"
                onClick={handleVerify}
                disabled={!isLoggedIn || !proofTxHash.trim() || verifying}
                className="px-5 shrink-0"
              >
                {verifying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                    Checking
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
            {verificationResult === 'verified' && (
              <div className="mt-3">
                <VerdictBanner
                  level="VERIFIED"
                  headline="Threat verified: auto-approved"
                  body="The engine returned a RED verdict for this transaction. Your report will publish as verified."
                />
              </div>
            )}
            {verificationResult === 'failed' && (
              <div className="mt-3">
                <VerdictBanner
                  level="YELLOW"
                  headline="No malicious behavior found"
                  body="This transaction scored GREEN/YELLOW. You can still submit and it will be marked unverified."
                />
              </div>
            )}
          </Field>

          {!isLoggedIn && (
            <p className="font-mono text-[12px] text-faint border border-line rounded-[var(--radius-ctl)] px-3.5 py-3 bg-surface-1">
              Sign in with Google above to enable reporting. No wallet, no gas, no setup.
            </p>
          )}

          <div className="border-t border-line-soft pt-5">
            <Button type="submit" full size="lg" disabled={!isLoggedIn || submitting}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={1.75} />
                  {loadingStage || 'Submitting…'}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" strokeWidth={1.75} />
                  Submit report (gas sponsored)
                </>
              )}
            </Button>
            <p className="mt-3.5 text-center font-mono text-[11px] text-faint">
              evidence → walrus · anchored → sui · auth → google sign-in only
            </p>
          </div>
        </form>

        <aside className="space-y-5 lg:sticky lg:top-24">
          <Card className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <Info className="w-4 h-4 text-sui" strokeWidth={1.75} />
              <h3 className="text-[14.5px] font-semibold">How verification works</h3>
            </div>
            <p className="text-sm text-low leading-relaxed">
              We simulate the proof transaction on Sui, parse what it actually does, and compare it
              against the claimed intent using the same multi-layer analysis as the main console. A RED
              verdict means the chain evidence agrees with you.
            </p>
            <div className="mt-4 space-y-2.5 font-mono text-[11.5px] text-low">
              <div className="flex gap-2.5">
                <CircleCheck className="w-3.5 h-3.5 text-safe mt-0.5 flex-shrink-0" strokeWidth={2} />
                signed analysis result, not an opinion
              </div>
              <div className="flex gap-2.5">
                <CircleCheck className="w-3.5 h-3.5 text-safe mt-0.5 flex-shrink-0" strokeWidth={2} />
                raw evidence stored on walrus
              </div>
              <div className="flex gap-2.5">
                <CircleCheck className="w-3.5 h-3.5 text-safe mt-0.5 flex-shrink-0" strokeWidth={2} />
                registry is on-chain, anyone can audit
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <ShieldCheck className="w-4 h-4 text-safe" strokeWidth={1.75} />
              <h3 className="text-[14.5px] font-semibold">Why it’s free</h3>
            </div>
            <p className="text-sm text-low leading-relaxed">
              Sponsoring report gas is cheap for us and decisive for the network: every scam added to
              the registry protects the next person who is about to sign.
            </p>
          </Card>

          <div className="flex items-start gap-2.5 px-4 py-3.5 border border-warn-line bg-warn-soft rounded-[var(--radius-tile)]">
            <TriangleAlert className="w-4 h-4 text-warn mt-0.5 flex-shrink-0" strokeWidth={1.75} />
            <p className="text-[13px] text-mid leading-relaxed">
              Reports are public and permanent. Only flag contracts you genuinely believe are
              malicious. False reports waste reviewers’ time.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
