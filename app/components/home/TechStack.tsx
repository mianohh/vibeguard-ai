'use client';

import { SuiIcon, WalrusIcon, NitroIcon, GoogleIcon, SealIcon } from '../icons';

const techItems = [
  {
    name: 'Sui Network',
    description: 'Trusted state & execution',
    color: '#4DA2FF',
    icon: <SuiIcon />,
  },
  {
    name: 'Walrus Protocol',
    description: 'Decentralized evidence storage',
    color: '#00D4FF',
    icon: <WalrusIcon />,
  },
  {
    name: 'AWS Nitro Enclaves',
    description: 'Verified compute in TEE',
    color: '#FBBF24',
    icon: <NitroIcon />,
  },
  {
    name: 'Google OAuth',
    description: 'zkLogin wallet authentication',
    color: '#FF4757',
    icon: <GoogleIcon />,
  },
  {
    name: 'Seal Encryption',
    description: 'PCR-based access control',
    color: '#6FFFE9',
    icon: <SealIcon />,
  },
];

export default function TechStack() {
  return (
    <section className="border-none py-6 lg:py-8">
      <div className="container">
        <div className="text-center mb-6">
          <p className="text-primary text-base sm:text-lg font-semibold mb-2 uppercase tracking-wider">
            Powered By
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Built on the Sui Ecosystem
          </h2>
        </div>

        <div className="tech-marquee">
          <div className="tech-marquee-inner">
            {[...techItems, ...techItems].map((tech, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-6 py-4 glass-card min-w-[280px] hover:scale-105 transition-transform"
                style={{ borderColor: `${tech.color}33` }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${tech.color}20`, color: tech.color }}
                >
                  {tech.icon}
                </div>
                <div>
                  <div className="text-white font-semibold text-sm">{tech.name}</div>
                  <div className="text-lightblue text-xs">{tech.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
