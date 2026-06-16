'use client';

import Link from 'next/link';

export default function Hero() {
  return (
    <section className="relative py-0 overflow-hidden">
      <div className="bg-banner-image absolute w-full h-full top-0 blur-390" />

      <div className="container lg:pt-8 pt-3 relative">
        <div className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 py-4 lg:py-8 items-center">
            <div className="lg:col-span-7 mb-6 lg:mb-0">
              <div className="flex items-center gap-2 mb-6">
                <div className="sui-symbol w-10 h-10" />
                <span className="px-3 py-1 text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-primary to-secondary text-white rounded-full">
                  Pre-Transaction Security
                </span>
              </div>

              <h1 className="mb-5 lg:text-start text-center sm:leading-snug leading-tight">
                Eliminate Blind Signing on Sui
              </h1>

              <p className="text-white font-normal mb-10 max-w-[85%] lg:text-start text-center lg:mx-0 mx-auto">
                Analyze real Sui transactions before you sign them. Deterministic threat analysis,
                enclave-verified pattern scoring, and decentralized evidence storage protect every transaction.
              </p>

              <div className="flex align-middle justify-center lg:justify-start flex-wrap gap-4">
                <Link
                  href="/"
                  className="text-base lg:text-xl font-semibold text-white py-3 lg:py-4 px-6 lg:px-12 bg-gradient-to-r from-primary to-secondary hover:from-secondary hover:to-primary rounded-xl cursor-pointer transition-all duration-300"
                >
                  Analyze Transaction
                </Link>
                <Link
                  href="/demo"
                  className="flex items-center gap-2 text-white hover:text-primary transition-colors cursor-pointer py-3 lg:py-4 px-4 lg:px-6"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  <span className="font-semibold">Watch Demo</span>
                </Link>
              </div>
            </div>

            <div className="hidden lg:flex lg:col-span-5 justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-secondary/30 blur-3xl rounded-full" />
                <div className="relative glass-card p-8 w-80">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-status-safe/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-status-safe" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">Transaction Analysis</div>
                      <div className="text-xs text-lightblue">Real-time simulation</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-lightblue">Risk Level</span>
                      <span className="text-status-safe font-mono font-bold">GREEN</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-lightblue">Confidence</span>
                      <span className="text-sui-cyan font-mono">94.2%</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-lightblue">Enclave Verified</span>
                      <span className="text-status-verified font-mono">YES</span>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="text-xs text-lightpurple">
                      Safe to sign. No asset outflows detected.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
