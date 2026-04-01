'use client';

export default function EcosystemPage() {
  return (
    <div className="min-h-screen relative">
      <div className="ocean-background" />
      
      <div className="relative z-10 container mx-auto px-6 py-12 max-w-5xl">
        <div className="glass-card p-8 liquid-expand">
          <div className="flex items-center gap-3 mb-4">
            <svg className="w-10 h-10 text-sui-cyan" fill="currentColor" viewBox="0 0 20 20">
              <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
            </svg>
            <h1 className="text-4xl font-bold text-white tracking-tight">
              Ecosystem Primitives & Cross-Stack Integration
            </h1>
          </div>
          <p className="text-gray-400 text-lg mb-8">
            How VibeGuard AI combines Sui ecosystem primitives with core stack layers
          </p>

          {/* Architecture Overview */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Architecture Overview</h2>
            <div className="glass-card bg-ocean-mid/30 p-6">
              <div className="space-y-2 font-mono text-sm">
                <div className="text-blue-400">User (Google OAuth)</div>
                <div className="pl-4 text-slate-400">↓</div>
                <div className="pl-4 text-green-400">zkLogin (ephemeral burner wallet)</div>
                <div className="pl-4 text-slate-400">↓</div>
                <div className="pl-4 text-yellow-400">Sponsored Transaction (gasless)</div>
                <div className="pl-4 text-slate-400">↓</div>
                <div className="pl-4 text-purple-400">Sui (ReputationRegistry)</div>
                <div className="pl-4 text-slate-400">↓</div>
                <div className="pl-4 text-orange-400">Walrus (threat evidence)</div>
                <div className="pl-4 text-slate-400">↓</div>
                <div className="pl-4 text-pink-400">Nautilus (verified compute)</div>
                <div className="pl-4 text-slate-400">↓</div>
                <div className="pl-4 text-cyan-400">Seal (API key protection)</div>
              </div>
            </div>
          </section>

          {/* Core vs Primitives */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Core Stack vs Ecosystem Primitives</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="glass-card bg-sui-blue/10 border-sui-cyan/30 p-6">
                <h3 className="font-semibold text-sui-cyan mb-3">Core Stack</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>▸ Sui: Trusted state</li>
                  <li>▸ Walrus: Decentralized storage</li>
                  <li>▸ Seal: Protected access</li>
                  <li>▸ Nautilus: Verified compute</li>
                </ul>
              </div>

              <div className="glass-card bg-status-safe/10 border-status-safe/30 p-6">
                <h3 className="font-semibold text-status-safe mb-3">Ecosystem Primitives</h3>
                <ul className="space-y-2 text-sm text-gray-300">
                  <li>✓ zkLogin: OAuth wallet</li>
                  <li>✓ Sponsored Tx: Gasless execution</li>
                  <li className="text-gray-500">✗ Enoki: Not used</li>
                  <li className="text-gray-500">✗ DeepBook: Not applicable</li>
                </ul>
              </div>
            </div>
          </section>

          {/* zkLogin */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">zkLogin Integration</h2>
            
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
            <h2 className="text-2xl font-bold text-white mb-4">Why Native zkLogin (Not Enoki)?</h2>
            
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
              <p className="text-sm text-gray-400">
                <strong>Product Context:</strong> VibeGuard is B2B security infrastructure. 
                Primary users are wallet providers consuming threat intelligence. 
                Community reporting is secondary where current UX is acceptable.
              </p>
            </div>
          </section>

          {/* Why No DeepBook */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Why No DeepBookV3?</h2>
            
            <div className="glass-card bg-status-danger/10 border-status-danger/30 p-6">
              <p className="text-sm text-gray-300">
                <strong>VibeGuard is not a trading product.</strong> We provide transaction security 
                analysis and threat intelligence. No order flow, no market matching, no exchange functionality. 
                DeepBook would be architecturally incorrect.
              </p>
            </div>
          </section>

          {/* Product Pattern */}
          <section className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-4">Product Pattern: Verified-Compute</h2>
            
            <div className="glass-card bg-purple-500/10 border-purple-400/30 p-6">
              <p className="text-sm text-gray-300 mb-3">
                <strong>Module 5 Pattern 3: Verified-Compute Product</strong>
              </p>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>✓ Entry: zkLogin for community reporting</li>
                <li>✓ State: Sui (ReputationRegistry)</li>
                <li>✓ Compute: Nautilus (AI threat detection)</li>
                <li>✓ Access: Seal (Gemini API key)</li>
                <li>✓ Verification: verified: true on-chain</li>
              </ul>
            </div>
          </section>

          {/* Live Proofs */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Live Proof Transactions</h2>
            
            <div className="space-y-3">
              <div className="glass-card bg-ocean-mid/30 p-4">
                <p className="text-sm text-gray-200 mb-2">Enclave Registration</p>
                <a 
                  href="https://suiscan.xyz/testnet/tx/HGomNmBWweAd9dttBsyVhJZDPj8R69JL4jpXEy4SfPap"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sui-cyan hover:text-sui-aqua text-xs font-mono break-all"
                >
                  HGomNmBWweAd9dttBsyVhJZDPj8R69JL4jpXEy4SfPap
                </a>
              </div>

              <div className="glass-card bg-ocean-mid/30 p-4">
                <p className="text-sm text-gray-200 mb-2">Nautilus Verified Compute</p>
                <a 
                  href="https://suiscan.xyz/testnet/tx/8CS9rBGcRoApdvqaiqNCsYuMn7xWm3Tm6i4MovrrJiVW"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sui-cyan hover:text-sui-aqua text-xs font-mono break-all"
                >
                  8CS9rBGcRoApdvqaiqNCsYuMn7xWm3Tm6i4MovrrJiVW
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
