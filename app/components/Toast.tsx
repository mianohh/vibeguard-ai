'use client';

import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  details?: string;
  onClose: () => void;
}

export default function Toast({ message, type, details, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

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
            {details && (
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
