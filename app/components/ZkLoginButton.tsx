'use client';

import { useState, useEffect } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateNonce, generateRandomness, getExtendedEphemeralPublicKey, jwtToAddress } from '@mysten/sui/zklogin';
import { SuiClient } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '920125293845-8ocp43b7fg1er9o7dcscbg3ne93mh1iv.apps.googleusercontent.com';
const PROVER_URL = 'https://prover-dev.mystenlabs.com/v1';
const SUI_CLIENT = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

interface ZkLoginSession {
  address: string;
  email: string;
  jwt: string;
  ephemeralPrivateKey: string;
  userSalt: string;
  zkProof?: any;
  maxEpoch: number;
}

export default function ZkLoginButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  useEffect(() => {
    // Check if we have a stored session
    const storedSession = sessionStorage.getItem('zklogin_session');
    
    if (storedSession) {
      const session: ZkLoginSession = JSON.parse(storedSession);
      setIsLoggedIn(true);
      setUserAddress(session.address);
      setUserEmail(session.email);
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
    try {
      // Clear any old session data first
      sessionStorage.removeItem('zklogin_ephemeral_seed');
      sessionStorage.removeItem('zklogin_ephemeral_private_key');
      sessionStorage.removeItem('zklogin_randomness');
      sessionStorage.removeItem('zklogin_max_epoch');
      sessionStorage.removeItem('zklogin_nonce');
      
      // Step 1: Get current epoch for maxEpoch calculation
      const { epoch } = await SUI_CLIENT.getLatestSuiSystemState();
      const maxEpoch = Number(epoch) + 10;
      
      // Step 2: Generate ephemeral keypair
      const ephemeralKeyPair = new Ed25519Keypair();
      const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();
      
      // Step 3: Generate randomness and nonce with maxEpoch
      const randomness = generateRandomness();
      const nonce = generateNonce(ephemeralPublicKey, maxEpoch, randomness);
      
      // Step 4: Store the FULL secret key string (suiprivkey1...) - do NOT slice or encode
      const secretKeyString = ephemeralKeyPair.getSecretKey();
      sessionStorage.setItem('zklogin_secret_key', secretKeyString);
      sessionStorage.setItem('zklogin_randomness', randomness);
      sessionStorage.setItem('zklogin_max_epoch', maxEpoch.toString());
      sessionStorage.setItem('zklogin_nonce', nonce);
      
      console.log('✅ Stored maxEpoch:', maxEpoch);
      console.log('✅ Stored nonce:', nonce);

      // Step 5: Redirect to Google OAuth with nonce
      const redirectUri = `${window.location.origin}/report`;
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('response_type', 'id_token');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'openid email');
      authUrl.searchParams.set('nonce', nonce);

      window.location.href = authUrl.toString();
    } catch (error) {
      console.error('❌ zkLogin initialization failed:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      alert(`Failed to initialize zkLogin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOAuthCallback = async (idToken: string) => {
    setIsGeneratingProof(true);
    
    try {
      // Step 1: Decode JWT to get user info
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      console.log('✅ JWT decoded:', payload.email);
      
      // Step 2: Retrieve stored secret key string, randomness, and maxEpoch
      const secretKeyString = sessionStorage.getItem('zklogin_secret_key');
      const randomness = sessionStorage.getItem('zklogin_randomness');
      const maxEpoch = Number(sessionStorage.getItem('zklogin_max_epoch'));
      
      if (!secretKeyString || !randomness || !maxEpoch) {
        throw new Error('Missing secret key, randomness, or maxEpoch');
      }
      
      console.log('✅ Retrieved maxEpoch:', maxEpoch);
      
      // Decode the suiprivkey string to get the exact 32-byte secret seed
      const { secretKey } = decodeSuiPrivateKey(secretKeyString);
      const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(secretKey);
      
      // Step 3: Generate user salt (deterministic from sub)
      const userSalt = await generateSalt(payload.sub);
      
      // Step 4: Get extended ephemeral public key
      const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(
        ephemeralKeyPair.getPublicKey()
      );
      
      // Step 5: Request ZK proof from Mysten prover
      console.log('🔄 Requesting ZK proof from Mysten prover...');
      const zkProofResponse = await fetch(PROVER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jwt: idToken,
          extendedEphemeralPublicKey,
          maxEpoch,
          jwtRandomness: randomness,
          salt: userSalt,
          keyClaimName: 'sub'
        })
      });
      
      if (!zkProofResponse.ok) {
        const errorText = await zkProofResponse.text();
        throw new Error(`Prover failed: ${zkProofResponse.status} - ${errorText}`);
      }
      
      const zkProof = await zkProofResponse.json();
      console.log('✅ ZK proof generated successfully');
      
      // Step 6: Derive zkLogin address
      const address = jwtToAddress(idToken, userSalt);
      console.log('🔐 zkLogin Address:', address);
      
      // Step 7: Store complete session
      const session: ZkLoginSession = {
        address,
        email: payload.email || 'user@gmail.com',
        jwt: idToken,
        ephemeralPrivateKey: secretKeyString,
        userSalt,
        zkProof,
        maxEpoch
      };
      
      sessionStorage.setItem('zklogin_session', JSON.stringify(session));
      
      setUserAddress(address);
      setIsLoggedIn(true);
      setUserEmail(payload.email || 'user@gmail.com');
      
      console.log('✅ Full zkLogin authentication complete');
    } catch (error) {
      console.error('❌ zkLogin proof generation failed:', error);
      alert(`zkLogin failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Cleanup
      sessionStorage.removeItem('zklogin_secret_key');
      sessionStorage.removeItem('zklogin_randomness');
      sessionStorage.removeItem('zklogin_max_epoch');
      sessionStorage.removeItem('zklogin_nonce');
    } finally {
      setIsGeneratingProof(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserAddress(null);
    setUserEmail(null);
    sessionStorage.removeItem('zklogin_session');
    sessionStorage.removeItem('zklogin_secret_key');
    sessionStorage.removeItem('zklogin_randomness');
    sessionStorage.removeItem('zklogin_max_epoch');
    sessionStorage.removeItem('zklogin_nonce');
  };

  // Generate deterministic salt from Google sub (must be 16 bytes)
  async function generateSalt(sub: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(sub);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Take first 16 bytes and convert to BigInt string
    const saltBytes = hashArray.slice(0, 16);
    const saltBigInt = BigInt('0x' + saltBytes.map(b => b.toString(16).padStart(2, '0')).join(''));
    return saltBigInt.toString();
  }

  if (isGeneratingProof) {
    return (
      <div className="flex items-center gap-3 px-6 py-2 bg-blue-900/30 border border-blue-500/50 rounded-lg">
        <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
        <span className="text-sm text-blue-300">Generating zkLogin proof...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      {!isLoggedIn ? (
        <button
          onClick={handleLogin}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium border border-blue-500/50 shadow-lg shadow-blue-900/20"
        >
          🔐 Login with Google (zkLogin)
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
