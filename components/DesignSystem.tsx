'use client';

import { useState } from 'react';
import { Copy, Check, Shield, AlertTriangle, CheckCircle } from 'lucide-react';

export function ThreatCard({ 
  threat 
}: { 
  threat: {
    packageId: string;
    blobId: string;
    riskLevel: 'RED' | 'YELLOW' | 'GREEN';
    verified: boolean;
    timestamp: number;
    description: string;
  }
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const riskColors = {
    RED: 'threat-card',
    YELLOW: 'threat-card warning',
    GREEN: 'threat-card safe',
  };

  return (
    <div className={`glass-card ${riskColors[threat.riskLevel]} p-6 liquid-expand`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {threat.riskLevel === 'RED' && (
            <div className="w-10 h-10 rounded-full bg-status-danger/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-status-danger" />
            </div>
          )}
          {threat.riskLevel === 'YELLOW' && (
            <div className="w-10 h-10 rounded-full bg-status-warning/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-status-warning" />
            </div>
          )}
          {threat.riskLevel === 'GREEN' && (
            <div className="w-10 h-10 rounded-full bg-status-safe/20 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-status-safe" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-white">
              {threat.riskLevel === 'RED' && 'Critical Threat Detected'}
              {threat.riskLevel === 'YELLOW' && 'Suspicious Activity'}
              {threat.riskLevel === 'GREEN' && 'Verified Safe'}
            </h3>
            <p className="text-sm text-gray-400">
              {new Date(threat.timestamp).toLocaleString()}
            </p>
          </div>
        </div>

        {threat.verified && (
          <div className="verification-badge">
            <div className="crypto-shield">
              <Shield className="w-4 h-4 text-status-verified" />
            </div>
            <span>Enclave Verified</span>
          </div>
        )}
      </div>

      <p className="text-gray-300 mb-4">{threat.description}</p>

      <div className="mb-3">
        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">
          Malicious Package ID
        </label>
        <div 
          className="hash-display w-full justify-between"
          onClick={() => copyToClipboard(threat.packageId, 'package')}
        >
          <span className="truncate">{threat.packageId}</span>
          {copied === 'package' ? (
            <Check className="w-4 h-4 text-status-safe flex-shrink-0" />
          ) : (
            <Copy className="w-4 h-4 flex-shrink-0" />
          )}
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 uppercase tracking-wider mb-1 block">
          Walrus Evidence Blob
        </label>
        <div 
          className="hash-display w-full justify-between"
          onClick={() => copyToClipboard(threat.blobId, 'blob')}
        >
          <span className="truncate">{threat.blobId}</span>
          {copied === 'blob' ? (
            <Check className="w-4 h-4 text-status-safe flex-shrink-0" />
          ) : (
            <Copy className="w-4 h-4 flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  );
}

export function RadarVisualization({ threats }: { threats: Array<{ x: number; y: number }> }) {
  return (
    <div className="radar-container">
      {[100, 75, 50, 25].map((percent) => (
        <div
          key={percent}
          className="radar-circle"
          style={{
            width: `${percent}%`,
            height: `${percent}%`,
          }}
        />
      ))}
      <div className="radar-sweep" />
      {threats.map((threat, i) => (
        <div
          key={i}
          className="threat-blip"
          style={{
            left: `${threat.x}%`,
            top: `${threat.y}%`,
          }}
        />
      ))}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="sui-symbol w-12 h-12" />
      </div>
    </div>
  );
}

export function ProgressStepper({ currentStep }: { currentStep: number }) {
  const steps = [
    { number: 1, label: 'Paste Address' },
    { number: 2, label: 'AI Analysis' },
    { number: 3, label: 'On-Chain Registration' },
  ];

  return (
    <div className="stepper">
      {steps.map((step, index) => (
        <div
          key={step.number}
          className={`step ${
            currentStep === step.number
              ? 'active'
              : currentStep > step.number
              ? 'completed'
              : ''
          }`}
        >
          <div className="step-circle">
            {currentStep > step.number ? (
              <Check className="w-6 h-6" />
            ) : (
              <span>{step.number}</span>
            )}
          </div>
          <span className="text-sm font-medium">{step.label}</span>
          {index < steps.length - 1 && <div className="step-line" />}
        </div>
      ))}
    </div>
  );
}

export function StatusIndicator({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`status-indicator ${active ? 'active' : ''}`}>
      <span>{label}</span>
    </div>
  );
}

export function Terminal({ children }: { children: React.ReactNode }) {
  return (
    <div className="terminal">
      <div className="terminal-header">
        <div className="terminal-dot red" />
        <div className="terminal-dot yellow" />
        <div className="terminal-dot green" />
        <span className="text-xs text-gray-400 ml-2">vibeguard-terminal</span>
      </div>
      <div className="terminal-body">{children}</div>
    </div>
  );
}

export function Toast({ 
  message, 
  type = 'success',
  onClose 
}: { 
  message: string; 
  type?: 'success' | 'warning' | 'error';
  onClose: () => void;
}) {
  return (
    <div className={`toast ${type}`}>
      <div className="flex items-center gap-3">
        {type === 'success' && <CheckCircle className="w-5 h-5 text-status-safe" />}
        {type === 'warning' && <AlertTriangle className="w-5 h-5 text-status-warning" />}
        {type === 'error' && <AlertTriangle className="w-5 h-5 text-status-danger" />}
        <span className="text-white">{message}</span>
        <button 
          onClick={onClose}
          className="ml-4 text-gray-400 hover:text-white transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function ScanningOverlay() {
  return (
    <div className="scanning-overlay">
      <div className="scan-line" />
    </div>
  );
}

export function PrimaryButton({ 
  children, 
  onClick,
  disabled = false 
}: { 
  children: React.ReactNode; 
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button 
      className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
      onClick={onClick}
      disabled={disabled}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}

export function GradientText({ children }: { children: React.ReactNode }) {
  return <span className="gradient-text">{children}</span>;
}
