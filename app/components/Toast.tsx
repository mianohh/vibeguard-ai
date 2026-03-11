'use client';

import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  details?: string;
  onClose: () => void;
}

export default function Toast({ message, type, details, onClose }: ToastProps) {
  const [copiedBlobId, setCopiedBlobId] = useState(false);

  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Parse details if it's JSON containing walrusBlobId
  let parsedData: any = null;
  let walrusBlobId: string | null = null;
  
  try {
    if (details && details.startsWith('{')) {
      parsedData = JSON.parse(details);
      walrusBlobId = parsedData.walrusBlobId;
    }
  } catch {
    // Not JSON, use as plain text
  }

  const copyBlobId = () => {
    if (walrusBlobId) {
      navigator.clipboard.writeText(walrusBlobId);
      setCopiedBlobId(true);
      setTimeout(() => setCopiedBlobId(false), 2000);
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in">
      <div className={`
        max-w-md rounded-lg shadow-2xl p-6 border-l-4
        ${type === 'success' 
          ? 'bg-green-50 border-green-500' 
          : 'bg-red-50 border-red-500'
        }
      `}>
        <div className="flex items-start gap-3">
          <div className="text-2xl">
            {type === 'success' ? '✅' : '❌'}
          </div>
          <div className="flex-1">
            <h3 className={`font-bold text-lg mb-1 ${
              type === 'success' ? 'text-green-900' : 'text-red-900'
            }`}>
              {message}
            </h3>
            
            {parsedData && type === 'success' ? (
              <div className="space-y-3 mt-3">
                <div className="text-sm text-green-700">
                  <div className="mb-1"><strong>Package ID:</strong> {parsedData.packageId.slice(0, 10)}...{parsedData.packageId.slice(-6)}</div>
                  <div className="mb-1"><strong>Reporter:</strong> {parsedData.address?.slice(0, 6)}...{parsedData.address?.slice(-4)}</div>
                  <div className="mb-3"><strong>Status:</strong> {parsedData.verificationResult === 'verified' ? 'Auto-Verified ✅' : 'Pending Review'}</div>
                </div>
                
                {walrusBlobId && (
                  <div className="bg-green-100 border border-green-300 rounded p-3">
                    <div className="text-xs font-semibold text-green-800 mb-1">Walrus Blob ID (Digital Receipt)</div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-white px-2 py-1 rounded border border-green-200 text-green-900 font-mono break-all">
                        {walrusBlobId}
                      </code>
                      <button
                        onClick={copyBlobId}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                        title="Copy Blob ID"
                      >
                        {copiedBlobId ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-green-600 leading-relaxed">
                  Your report has been stored on Walrus and recorded on-chain via the ReputationRegistry contract. Thank you for helping protect the Sui community!
                </p>
              </div>
            ) : details && (
              <p className={`text-sm whitespace-pre-line ${
                type === 'success' ? 'text-green-700' : 'text-red-700'
              }`}>
                {details}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className={`text-2xl leading-none ${
              type === 'success' ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
            }`}
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
