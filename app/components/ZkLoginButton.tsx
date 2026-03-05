'use client';

import { useState, useEffect } from 'react';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function ZkLoginButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have a stored session
    const storedAddress = sessionStorage.getItem('zklogin_address');
    const storedJwt = sessionStorage.getItem('zklogin_jwt');
    
    if (storedAddress && storedJwt) {
      setIsLoggedIn(true);
      setUserAddress(storedAddress);
      setUserEmail(sessionStorage.getItem('zklogin_email'));
      return;
    }

    // Check for JWT in URL hash after OAuth redirect
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const idToken = params.get('id_token');

    if (idToken) {
      handleOAuthCallback(idToken);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = async () => {
    if (!GOOGLE_CLIENT_ID) {
      alert('Google OAuth Client ID not configured. See ZKLOGIN_SETUP.md');
      return;
    }
    
    // Generate random nonce for OAuth
    const nonce = Math.random().toString(36).substring(2, 15);
    sessionStorage.setItem('zklogin_nonce', nonce);

    // Redirect to Google OAuth
    const redirectUri = `${window.location.origin}/report`;
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.set('response_type', 'id_token');
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('scope', 'openid email');
    authUrl.searchParams.set('nonce', nonce);

    window.location.href = authUrl.toString();
  };

  const handleOAuthCallback = async (idToken: string) => {
    try {
      // Decode JWT to get user info (basic decode, no verification needed for demo)
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      
      console.log('✅ zkLogin: JWT decoded successfully');
      console.log('📧 Email:', payload.email);
      console.log('🆔 Google Sub:', payload.sub);
      
      // Derive deterministic Sui address from JWT sub claim
      // In production, this would use zkLogin proof generation
      const sub = payload.sub;
      const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(sub));
      const hashArray = Array.from(new Uint8Array(hash));
      const address = '0x' + hashArray.slice(0, 32).map(b => b.toString(16).padStart(2, '0')).join('');
      
      console.log('🔐 Derived Sui Address:', address);
      
      setUserAddress(address);
      setIsLoggedIn(true);
      setUserEmail(payload.email || 'user@gmail.com');
      sessionStorage.setItem('zklogin_address', address);
      sessionStorage.setItem('zklogin_jwt', idToken);
      sessionStorage.setItem('zklogin_email', payload.email || 'user@gmail.com');
    } catch (error) {
      console.error('❌ Failed to process JWT:', error);
      alert('Login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserAddress(null);
    setUserEmail(null);
    sessionStorage.removeItem('zklogin_address');
    sessionStorage.removeItem('zklogin_jwt');
    sessionStorage.removeItem('zklogin_nonce');
    sessionStorage.removeItem('zklogin_email');
  };

  return (
    <div className="flex items-center gap-4">
      {!isLoggedIn ? (
        <button
          onClick={handleLogin}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium border border-blue-500/50 shadow-lg shadow-blue-900/20"
        >
          {GOOGLE_CLIENT_ID ? '🔐 Login with Google (zkLogin)' : '⚠️ Configure Google OAuth'}
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <div className="text-slate-400">
              {userEmail && <span className="mr-2">📧 {userEmail}</span>}
            </div>
            <div className="text-slate-300">
              Connected: {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-slate-700 text-slate-200 rounded-lg hover:bg-slate-600 transition-colors text-sm border border-slate-600"
          >
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
