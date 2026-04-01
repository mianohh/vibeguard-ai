/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          deepest: '#0A1128',
          deep: '#0F172A',
          mid: '#1E293B',
          surface: '#334155',
        },
        sui: {
          blue: '#4DA2FF',
          cyan: '#00D4FF',
          aqua: '#6FFFE9',
        },
        status: {
          safe: '#00FFA3',
          verified: '#5EEAD4',
          warning: '#FBBF24',
          danger: '#FF4757',
          critical: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Space Grotesk', 'sans-serif'],
      },
      backgroundImage: {
        'ocean-gradient': 'linear-gradient(135deg, #0A1128 0%, #0F172A 100%)',
        'sui-gradient': 'linear-gradient(135deg, #4DA2FF 0%, #00D4FF 100%)',
        'glass': 'rgba(30, 41, 59, 0.6)',
      },
      backdropBlur: {
        glass: '16px',
      },
      boxShadow: {
        'sui-glow': '0 4px 16px rgba(77, 162, 255, 0.3)',
        'sui-glow-lg': '0 8px 32px rgba(77, 162, 255, 0.5)',
        'glass': '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        'verified': '0 0 16px rgba(94, 234, 212, 0.3)',
      },
      animation: {
        'ocean-pulse': 'oceanPulse 8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
        'blip-pulse': 'blipPulse 2s ease-in-out infinite',
        'liquid-expand': 'liquidExpand 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'toast-slide': 'toastSlide 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'scan-sweep': 'scanSweep 2s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
        'gradient-shift': 'gradientShift 3s ease infinite',
        'status-pulse': 'statusPulse 2s ease-in-out infinite',
      },
      keyframes: {
        oceanPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        blipPulse: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.3)', opacity: '0.7' },
        },
        liquidExpand: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '50%': { transform: 'scale(1.02)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        toastSlide: {
          '0%': { transform: 'translateX(400px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scanSweep: {
          '0%': { top: '0', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { top: '100%', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        gradientShift: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        statusPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.2)' },
        },
      },
    },
  },
  plugins: [],
}
