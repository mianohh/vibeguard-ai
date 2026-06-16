'use client';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
      </svg>
    ),
    title: 'Deterministic Threat Engine',
    description: 'Real-time transaction simulation and pattern-based risk scoring executed entirely inside isolated enclaves to detect honeypots, asset drains, and phishing vectors natively.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Enclave Verified',
    description: 'Threat detection runs inside AWS Nitro TEE. Every analysis is signed with an Ed25519 keypair verified on-chain before registry commitment.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 12v3c0 1.657 3.134 3 7 3s7-1.343 7-3v-3c0 1.657-3.134 3-7 3s-7-1.343-7-3z" />
        <path d="M3 7v3c0 1.657 3.134 3 7 3s7-1.343 7-3V7c0 1.657-3.134 3-7 3S3 8.657 3 7z" />
        <path d="M17 5c0 1.657-3.134 3-7 3S3 6.657 3 5s3.134-3 7-3 7 1.343 7 3z" />
      </svg>
    ),
    title: 'Decentralized Storage',
    description: 'Threat evidence stored on Walrus protocol — tamper-proof, decentralized, and accessible across the entire Sui ecosystem.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Community Reporting',
    description: 'Zero-friction threat reporting via Google OAuth zkLogin. Community members report malicious contracts without wallet setup.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
      </svg>
    ),
    title: 'Gasless Reporting',
    description: 'Sponsored transactions eliminate gas fees for reporters. Community protection without financial barriers.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
    title: 'B2B Threat API',
    description: 'Real-time threat intelligence feed for wallet providers. Server-Sent Events and webhooks for instant threat notifications.',
  },
];

export default function Features() {
  return (
    <section id="features-section" className="scroll-mt-16">
      <div className="container relative">
        <div className="bg-linear-to-r from-primary to-secondary absolute w-full h-full top-0 -left-1/4 blur-390" />

        <div className="relative z-10">
          <div className="mb-8">
            <p className="text-primary text-base sm:text-lg font-semibold mb-4 text-center uppercase tracking-wider">
              Features
            </p>
            <h2 className="font-semibold mb-6 text-center max-w-2xl mx-auto sm:leading-14">
              Enterprise-Grade Security for Sui
            </h2>
            <p className="lg:text-lg font-normal text-lightpurple text-center max-w-2xl mx-auto">
              Comprehensive threat detection and prevention built for the Sui ecosystem.
              From individual users to institutional wallets.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {features.map((feature, i) => (
              <div
                key={i}
                className="glass-card p-5 lg:p-8 rounded-lg flex flex-col gap-3 border border-white/5 hover:border-sui-cyan/30 transition-all duration-300"
              >
                <div className="rounded-full bg-linear-to-r from-primary to-secondary w-fit p-4 flex items-center justify-center text-white">
                  {feature.icon}
                </div>
                <h5 className="text-white/80 text-lg font-medium">
                  {feature.title}
                </h5>
                <p className="text-white/40 text-sm font-normal">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
