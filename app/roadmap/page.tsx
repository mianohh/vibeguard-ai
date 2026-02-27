'use client';

export default function Roadmap() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="container mx-auto px-6 py-12 max-w-4xl">
        
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-slate-100 mb-3">
            🗺️ Product Roadmap
          </h1>
          <p className="text-slate-400">
            Our vision for the future of transaction security on Sui
          </p>
        </div>

        {/* Phase 1 */}
        <div className="security-surface p-6 mb-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">✅</span>
            <h2 className="text-2xl font-bold text-emerald-400">Phase 1: Core Security</h2>
            <span className="ml-auto text-sm text-emerald-400 font-medium">Complete</span>
          </div>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start"><span className="text-emerald-400 mr-2">✓</span> Static transaction analysis</li>
            <li className="flex items-start"><span className="text-emerald-400 mr-2">✓</span> Live simulation with Sui RPC (dryRunTransactionBlock)</li>
            <li className="flex items-start"><span className="text-emerald-400 mr-2">✓</span> Intent mismatch detection</li>
            <li className="flex items-start"><span className="text-emerald-400 mr-2">✓</span> AI-powered explanations</li>
            <li className="flex items-start"><span className="text-emerald-400 mr-2">✓</span> Contract blacklist/whitelist</li>
            <li className="flex items-start"><span className="text-emerald-400 mr-2">✓</span> Live impact dashboard</li>
            <li className="flex items-start"><span className="text-emerald-400 mr-2">✓</span> TypeScript SDK (published and working)</li>
          </ul>
        </div>

        {/* Phase 2 */}
        <div className="security-surface p-6 mb-6 border-2 border-blue-500/30">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">🚧</span>
            <h2 className="text-2xl font-bold text-blue-400">Phase 2: Move Integration</h2>
            <span className="ml-auto text-sm text-blue-400 font-medium">In Progress</span>
          </div>
          <ul className="space-y-3 text-slate-300">
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">🔄</span>
              <div>
                <div className="font-semibold">On-Chain Reputation Registry</div>
                <div className="text-sm text-slate-400">Decentralized Move contract for blacklisting malicious packages</div>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">🔄</span>
              <div>
                <div className="font-semibold">Move Bytecode Analyzer</div>
                <div className="text-sm text-slate-400">Deep inspection of smart contract logic</div>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">🔄</span>
              <div>
                <div className="font-semibold">Function Signature Verification</div>
                <div className="text-sm text-slate-400">Validate Move function calls match expected behavior</div>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">🔄</span>
              <div>
                <div className="font-semibold">Module Dependency Mapping</div>
                <div className="text-sm text-slate-400">Track which packages a contract imports</div>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">🔄</span>
              <div>
                <div className="font-semibold">Reentrancy Detection</div>
                <div className="text-sm text-slate-400">Identify potential reentrancy vulnerabilities in Move code</div>
              </div>
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">🔄</span>
              <div>
                <div className="font-semibold">Resource Flow Analysis</div>
                <div className="text-sm text-slate-400">Track how assets move through Move modules</div>
              </div>
            </li>
          </ul>
        </div>

        {/* Phase 3 */}
        <div className="security-surface p-6 mb-6">
          <div className="flex items-center mb-4">
            <span className="text-2xl mr-3">📅</span>
            <h2 className="text-2xl font-bold text-slate-300">Phase 3: Advanced Features</h2>
            <span className="ml-auto text-sm text-slate-400 font-medium">Planned</span>
          </div>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start"><span className="text-slate-500 mr-2">○</span> Browser extension for one-click protection</li>
            <li className="flex items-start"><span className="text-slate-500 mr-2">○</span> Wallet SDK integration (Sui Wallet, Ethos, Suiet)</li>
            <li className="flex items-start"><span className="text-slate-500 mr-2">○</span> Historical scam pattern database</li>
            <li className="flex items-start"><span className="text-slate-500 mr-2">○</span> Multi-signature transaction support</li>
            <li className="flex items-start"><span className="text-slate-500 mr-2">○</span> Real-time threat intelligence feed</li>
          </ul>
        </div>

        <div className="text-center mt-12">
          <a 
            href="/"
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
          >
            ← Back to Home
          </a>
        </div>

      </div>
    </div>
  );
}
