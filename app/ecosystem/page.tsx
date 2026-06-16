'use client';

import { SuiIcon, WalrusIcon, NitroIcon, GoogleIcon, SealIcon, CheckCircleIcon, CrossIcon, ShieldCheckIcon } from '../components/icons';

export default function EcosystemPage() {
  return (
    <div className="min-h-screen relative">
      <div className="ocean-background" />
      <div className="purple-section-blur" />
      
      <div className="relative z-10 container mx-auto px-4 py-6 lg:py-10 max-w-5xl section-divider">
        <div className="glass-card p-4 sm:p-6 lg:p-8 liquid-expand">
          <div className="flex items-center gap-3 mb-4">
            <SuiIcon className="w-10 h-10 text-sui-blue" />
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Ecosystem Primitives & Cross-Stack Integration
            </h1>
          </div>
          <p className="text-lightblue text-lg mb-8">
            How VibeGuard AI combines Sui ecosystem primitives with core stack layers
          </p>

          {/* Architecture Overview */}
          <section className="mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">System Design</p>
            <h2 className="text-2xl font-bold text-white mb-4">Architecture Overview</h2>
            <div className="glass-card bg-ocean-mid/30 p-6">
              <div className="space-y-2 font-mono text-sm">
                <div className="text-blue-400">User (Google OAuth)</div>
                <div className="pl-4 text-slate-400">↓</div>
                <div className="pl-4 text-green-400">zkLogin (ephemeral burner wallet)</div>
                <div className="pl-4 text-slate-400">↓</div>
                <div className="pl-4 text-yellow-400">Sponsored Transaction (gasless)</div>
                <div className="pl-4 text-slate-400">↓</div>
                <div className="pl-4 text-primary">Sui (ReputationRegistry)</div>
                <div className="pl-4 text-slate-400">↓</div>
                <div className="pl-4 text-orange-400">Walrus (threat evidence)</div>
                <div className="pl-4 text-slate-400">↓</div>
                <div className="pl-4 text-pink-400">Nautilus (verified compute)</div>
                <div className="pl-4 text-slate-400">↓</div>
                <div className="pl-4 text-cyan-400">Seal (agent config protection)</div>
              </div>
            </div>
          </section>

          {/* Core vs Primitives */}
          <section className="mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Stack Comparison</p>
            <h2 className="text-2xl font-bold text-white mb-4 text-center">Core Stack vs Ecosystem Primitives</h2>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto justify-center">
              <div className="glass-card bg-sui-blue/10 border-sui-cyan/30 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <SuiIcon className="w-6 h-6 text-sui-blue" />
                  <h3 className="font-semibold text-sui-cyan">Core Stack</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2"><SuiIcon className="w-4 h-4 text-sui-blue" /> Sui: Trusted state</li>
                  <li className="flex items-center gap-2"><WalrusIcon className="w-4 h-4 text-sui-cyan" /> Walrus: Decentralized storage</li>
                  <li className="flex items-center gap-2"><SealIcon className="w-4 h-4 text-sui-aqua" /> Seal: Protected access</li>
                  <li className="flex items-center gap-2"><NitroIcon className="w-4 h-4 text-status-warning" /> Nautilus: Verified compute</li>
                </ul>
              </div>

              <div className="glass-card bg-status-safe/10 border-status-safe/30 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircleIcon className="w-6 h-6 text-status-safe" />
                  <h3 className="font-semibold text-status-safe">Ecosystem Primitives</h3>
                </div>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2"><GoogleIcon className="w-4 h-4 text-status-safe" /> zkLogin: OAuth wallet</li>
                  <li className="flex items-center gap-2"><CheckCircleIcon className="w-4 h-4 text-status-safe" /> Sponsored Tx: Gasless execution</li>
                  <li className="flex items-center gap-2 text-lightblue"><CrossIcon className="w-4 h-4" /> Enoki: Not used</li>
                  <li className="flex items-center gap-2 text-lightblue"><CrossIcon className="w-4 h-4" /> DeepBook: Not applicable</li>
                </ul>
              </div>
            </div>
          </section>

          {/* zkLogin */}
          <section className="mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Authentication</p>
            <div className="flex items-center gap-2 mb-4">
              <GoogleIcon className="w-8 h-8 text-red-400" />
              <h2 className="text-2xl font-bold text-white">zkLogin Integration</h2>
            </div>
            
            <div className="glass-card bg-ocean-mid/30 p-6 mb-4">
              <h3 className="font-semibold text-gray-200 mb-3">Why zkLogin?</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>✓ Zero wallet friction for community reporting</li>
                <li>✓ Privacy-preserving (OAuth not linked publicly)</li>
                <li>✓ Self-custody ephemeral keypair</li>
                <li>✓ Combined with sponsored transactions</li>
              </ul>
            </div>

            <div className="glass-card bg-sui-blue/10 border-sui-cyan/30 p-4">
              <p className="text-sm text-gray-300 mb-2">Live Proof:</p>
              <a 
                href="https://suiscan.xyz/testnet/tx/57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sui-cyan hover:text-sui-aqua text-xs font-mono break-all"
              >
                57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R
              </a>
            </div>
          </section>

          {/* Why Not Enoki */}
          <section className="mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Design Decision</p>
            <div className="flex items-center gap-2 mb-4">
              <SuiIcon className="w-8 h-8 text-sui-blue" />
              <h2 className="text-2xl font-bold text-white">Why Native zkLogin (Not Enoki)?</h2>
            </div>
            
            <div className="glass-card bg-ocean-mid/30 p-6">
              <p className="text-sm text-gray-300 mb-4">
                <strong>Our Choice:</strong> Native zkLogin with custom sponsored transaction flow
              </p>
              <ul className="space-y-2 text-sm text-gray-300 mb-4">
                <li>✓ Full control over security reporting UX</li>
                <li>✓ Direct Sui primitive integration</li>
                <li>✓ Simpler architecture for B2B product</li>
                <li>✓ No external service dependencies</li>
              </ul>
              <p className="text-sm text-lightblue">
                <strong>Product Context:</strong> VibeGuard is B2B security infrastructure. 
                Primary users are wallet providers consuming threat intelligence. 
                Community reporting is secondary where current UX is acceptable.
              </p>
            </div>
          </section>

          {/* Why No DeepBook */}
          <section className="mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Scope Clarification</p>
            <div className="flex items-center gap-2 mb-4">
              <CrossIcon className="w-8 h-8 text-status-danger" />
              <h2 className="text-2xl font-bold text-white">Why No DeepBookV3?</h2>
            </div>
            
            <div className="glass-card bg-status-danger/10 border-status-danger/30 p-6">
              <p className="text-sm text-gray-300">
                <strong>VibeGuard is not a trading product.</strong> We provide transaction security 
                analysis and threat intelligence. No order flow, no market matching, no exchange functionality. 
                DeepBook would be architecturally incorrect.
              </p>
            </div>
          </section>

          {/* Seal Integration */}
          <section className="mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Access Control</p>
            <div className="flex items-center gap-2 mb-4">
              <SealIcon className="w-8 h-8 text-sui-aqua" />
              <h2 className="text-2xl font-bold text-white">Seal Access Control</h2>
            </div>

            <div className="glass-card bg-cyan-500/10 border-cyan-400/30 p-6 mb-4">
              <p className="text-sm text-gray-300 mb-3">
                <strong>Pattern 4 — Secure Input Layer for Verified Compute</strong>
              </p>
              <p className="text-sm text-lightblue mb-4">
                The proprietary threat-agent configuration (scoring weights, risk thresholds, heuristic rules)
                is encrypted under a PCR-based Seal policy. Only an enclave whose PCR measurements match
                the registered policy can decrypt and load the configuration.
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>✓ Secret encrypted under Seal policy ID <code className="text-cyan-400">0x00</code> via <code className="text-cyan-400">scripts/seal-setup.ts</code></li>
                <li>✓ Approved enclave registered via <code className="text-cyan-400">seal_enclave::register_enclave()</code> — stores PCRs + Ed25519 pubkey on-chain</li>
                <li>✓ Seal key servers verify PCR measurements before returning key shares</li>
                <li>✓ Enclave signs output: <code className="text-cyan-400">pkg_bytes(32) + blob_bytes + timestamp_ms LE64</code></li>
                <li>✓ <code className="text-cyan-400">seal_enclave::verify_and_report()</code> verifies Ed25519 signature before emitting <code className="text-cyan-400">ThreatVerified</code></li>
              </ul>
            </div>

            <div className="glass-card bg-ocean-mid/30 p-4">
              <p className="text-sm text-gray-300 mb-1">EnclaveConfig Object (registered PCRs + public key)</p>
              <a
                href="https://suiscan.xyz/testnet/object/0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sui-cyan hover:text-sui-aqua text-xs font-mono break-all"
              >
                0x2ca9a5fe17b6f53259ccf2c793268a82bd04e3d82fb3bc482a4dbb740400c502
              </a>
            </div>
          </section>

          {/* Product Pattern */}
          <section className="mb-12">
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">Verified Compute</p>
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheckIcon className="w-8 h-8 text-primary" />
              <h2 className="text-2xl font-bold text-white">Product Pattern: Verified-Compute</h2>
            </div>
            
            <div className="glass-card bg-primary/10 border-primary/30 p-6">
              <p className="text-sm text-gray-300 mb-3">
                <strong>Module 5 Pattern 3: Verified-Compute Product</strong>
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>✓ Entry: zkLogin for community reporting</li>
                <li>✓ State: Sui (ReputationRegistry)</li>
                <li>✓ Compute: Nautilus (Rust TEE threat detection inside AWS Nitro Enclave)</li>
                <li>✓ Access: Seal (threat-agent config encrypted under PCR-based policy — inaccessible outside approved enclave)</li>
                <li>✓ Verification: <code className="text-primary">ThreatVerified</code> event emitted on-chain after Ed25519 signature check</li>
              </ul>
            </div>
          </section>

          {/* Live Proofs */}
          <section>
            <p className="text-primary text-sm font-semibold uppercase tracking-wider mb-2">On-Chain Evidence</p>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircleIcon className="w-8 h-8 text-status-safe" />
              <h2 className="text-2xl font-bold text-white">Live Proof Transactions</h2>
            </div>
            
            <div className="space-y-3">
              <div className="glass-card bg-ocean-mid/30 p-4">
                <p className="text-sm text-gray-200 mb-2">Production Enclave Registration</p>
                <a 
                  href="https://suiscan.xyz/testnet/tx/3QNgqGy5uMYdzuEjitbjkkd8s6LyWeqD9CJwptYkoZPb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sui-cyan hover:text-sui-aqua text-xs font-mono break-all"
                >
                  3QNgqGy5uMYdzuEjitbjkkd8s6LyWeqD9CJwptYkoZPb
                </a>
              </div>

              <div className="glass-card bg-ocean-mid/30 p-4">
                <p className="text-sm text-gray-200 mb-2">Atomic Threat Report (ThreatVerified + ThreatReported)</p>
                <a 
                  href="https://suiscan.xyz/testnet/tx/6qBWeX62UUzxm6GromBfo6fwXsNNNYjh9WbzfTrJqYDk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sui-cyan hover:text-sui-aqua text-xs font-mono break-all"
                >
                  6qBWeX62UUzxm6GromBfo6fwXsNNNYjh9WbzfTrJqYDk
                </a>
              </div>

              <div className="glass-card bg-ocean-mid/30 p-4">
                <p className="text-sm text-gray-200 mb-2">zkLogin Community Report</p>
                <a 
                  href="https://suiscan.xyz/testnet/tx/57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sui-cyan hover:text-sui-aqua text-xs font-mono break-all"
                >
                  57hge1tQPnmrwLyFb6NhQosznWNdBqGbC3qAHw3Auh7R
                </a>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
