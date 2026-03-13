'use client';

import { useState, useEffect } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateNonce, generateRandomness, getExtendedEphemeralPublicKey } from '@mysten/sui/zklogin';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '920125293845-8ocp43b7fg1er9o7dcscbg3ne93mh1iv.apps.googleusercontent.com';
const PROVER_URL = 'https://prover-dev.mystenlabs.com/v1';
const SUI_CLIENT = new SuiClient({ url: getFullnodeUrl('testnet') });

interface ZkLoginBurnerSession {
  zkLoginAddress: string;
  burnerAddress: string;
  burnerSecretKey: string;
  email: string;
  jwt: string;
  zkProof?: any;
  maxEpoch: number;
  createdAt: string;
}

export default function ZkLoginButton() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  useEffect(() => {
    // Check if we have a stored zkLogin-backed burner session
    const storedSession = sessionStorage.getItem('zklogin_burner_session');
    
    if (storedSession) {
      const session: ZkLoginBurnerSession = JSON.parse(storedSession);
      setIsLoggedIn(true);
      setUserAddress(session.burnerAddress); // Use burner address for transactions
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
      sessionStorage.removeItem('zklogin_burner_session');
      sessionStorage.removeItem('burner_secret_key');
      sessionStorage.removeItem('burner_address');
      
      // Step 1: Get current epoch for maxEpoch calculation
      const { epoch } = await SUI_CLIENT.getLatestSuiSystemState();
      const maxEpoch = Number(epoch) + 20;
      
      // Step 2: Generate ephemeral keypair for zkLogin
      const ephemeralKeyPair = new Ed25519Keypair();
      const ephemeralPublicKey = ephemeralKeyPair.getPublicKey();
      
      // Step 3: Generate randomness and nonce
      const randomness = generateRandomness();
      const nonce = generateNonce(ephemeralPublicKey, maxEpoch, randomness);
      
      // Step 4: Store zkLogin session data
      const secretKeyString = ephemeralKeyPair.getSecretKey();
      sessionStorage.setItem('zklogin_secret_key', secretKeyString);
      sessionStorage.setItem('zklogin_randomness', randomness);
      sessionStorage.setItem('zklogin_max_epoch', maxEpoch.toString());
      sessionStorage.setItem('zklogin_nonce', nonce);
      
      console.log('✅ zkLogin initialization complete, redirecting to Google...');

      // Step 5: Redirect to Google OAuth
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
      alert(`Failed to initialize zkLogin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOAuthCallback = async (idToken: string) => {
    setIsGeneratingProof(true);
    
    try {
      // Step 1: Decode JWT to get user info
      const payload = JSON.parse(atob(idToken.split('.')[1]));
      
      // Step 2: Retrieve stored zkLogin session data
      const secretKeyString = sessionStorage.getItem('zklogin_secret_key');
      const randomness = sessionStorage.getItem('zklogin_randomness');
      const maxEpoch = Number(sessionStorage.getItem('zklogin_max_epoch'));
      
      if (!secretKeyString || !randomness || !maxEpoch) {
        throw new Error('Missing zkLogin session data');
      }
      
      // Step 3: Generate zkLogin proof
      const { secretKey } = decodeSuiPrivateKey(secretKeyString);
      const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(secretKey);
      const userSalt = await generateSalt(payload.sub);
      const extendedEphemeralPublicKey = getExtendedEphemeralPublicKey(ephemeralKeyPair.getPublicKey());
      
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
      
      // Step 4: Compute zkLogin address
      const { genAddressSeed, computeZkLoginAddressFromSeed } = await import('@mysten/sui/zklogin');
      const addressSeed = genAddressSeed(
        BigInt(userSalt),
        'sub',
        zkProof.issBase64Details.value,
        zkProof.headerBase64
      ).toString();
      
      const decodedJwt = JSON.parse(atob(idToken.split('.')[1]));
      const zkLoginAddress = computeZkLoginAddressFromSeed(
        BigInt(addressSeed),
        decodedJwt.iss
      );
      
      // Step 5: Generate deterministic burner wallet from zkLogin address
      const burnerWallet = await createZkLoginBackedBurner(zkLoginAddress);
      
      // Step 6: Store complete session
      const session: ZkLoginBurnerSession = {
        zkLoginAddress,
        burnerAddress: burnerWallet.address,
        burnerSecretKey: burnerWallet.secretKeyBase64,
        email: payload.email || 'user@gmail.com',
        jwt: idToken,
        zkProof,
        maxEpoch,
        createdAt: new Date().toISOString()
      };
      
      sessionStorage.setItem('zklogin_burner_session', JSON.stringify(session));
      sessionStorage.setItem('burner_secret_key', burnerWallet.secretKeyBase64);
      sessionStorage.setItem('burner_address', burnerWallet.address);
      
      setUserAddress(burnerWallet.address);
      setIsLoggedIn(true);
      setUserEmail(payload.email || 'user@gmail.com');
      
    } catch (error) {
      console.error('❌ zkLogin-Backed Burner creation failed:', error);
      alert(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // Cleanup on failure
      sessionStorage.removeItem('zklogin_secret_key');
      sessionStorage.removeItem('zklogin_randomness');
      sessionStorage.removeItem('zklogin_max_epoch');
      sessionStorage.removeItem('zklogin_nonce');
    } finally {
      setIsGeneratingProof(false);
    }
  };

  // Create deterministic burner wallet from zkLogin address
  const createZkLoginBackedBurner = async (zkLoginAddress: string) => {
    // Use zkLogin address as seed for deterministic burner generation
    const encoder = new TextEncoder();
    const data = encoder.encode(zkLoginAddress + 'burner_seed');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const seed = new Uint8Array(hashBuffer).slice(0, 32);
    
    // Create deterministic keypair from 32-byte seed
    const keypair = Ed25519Keypair.fromSecretKey(seed);
    
    // Store the raw 32-byte seed (not the full secret key)
    const seedBase64 = Buffer.from(seed).toString('base64');
    
    return {
      address: keypair.toSuiAddress(),
      keypair,
      secretKeyBase64: seedBase64,
      isZkLoginBacked: true
    };
  };

  // Generate deterministic salt from Google sub
  const generateSalt = async (sub: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(sub);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    const saltBytes = hashArray.slice(0, 16);
    const saltHex = Array.from(saltBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const saltBigInt = BigInt('0x' + saltHex);
    return saltBigInt.toString();
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserAddress(null);
    setUserEmail(null);
    sessionStorage.removeItem('zklogin_burner_session');
    sessionStorage.removeItem('burner_secret_key');
    sessionStorage.removeItem('burner_address');
    sessionStorage.removeItem('zklogin_secret_key');
    sessionStorage.removeItem('zklogin_randomness');
    sessionStorage.removeItem('zklogin_max_epoch');
    sessionStorage.removeItem('zklogin_nonce');
  };

  if (isGeneratingProof) {
    return (
      <div className="flex items-center gap-3 px-6 py-2 bg-blue-900/30 border border-blue-500/50 rounded-lg">
        <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin"></div>
        <span className="text-sm text-blue-300">Authenticating...</span>
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
          🔐 Sign in with Google
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <div className="text-sm">
            <div className="text-slate-400">
              {userEmail && <span className="mr-2">📧 {userEmail}</span>}
              <span className="text-blue-400">🔐 Authenticated</span>
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