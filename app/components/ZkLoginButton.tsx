'use client';

import { useState, useEffect } from 'react';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { generateNonce, generateRandomness, getExtendedEphemeralPublicKey, decodeJwt } from '@mysten/sui/zklogin';
import { decodeSuiPrivateKey } from '@mysten/sui/cryptography';

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '920125293845-8ocp43b7fg1er9o7dcscbg3ne93mh1iv.apps.googleusercontent.com';
const PROVER_URL = 'https://prover-dev.mystenlabs.com/v1';
const SUI_GRAPHQL_URL = 'https://graphql.testnet.sui.io/graphql';

async function fetchSuiEpoch(): Promise<number> {
  const response = await fetch(SUI_GRAPHQL_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: '{ epoch { epochId } }' }),
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`Sui network lookup failed (HTTP ${response.status})`);
  }
  const payload = await response.json();
  const epochId = payload?.data?.epoch?.epochId;
  if (typeof epochId !== 'number') {
    throw new Error(payload?.errors?.[0]?.message || 'Sui network lookup failed');
  }
  return epochId;
}

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
    const oauthError = params.get('error');
    const oauthErrorDescription = params.get('error_description');

    if (idToken) {
      handleOAuthCallback(idToken);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (oauthError) {
      alert(`Google sign-in failed: ${oauthErrorDescription || oauthError}`);
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
      const epoch = await fetchSuiEpoch();
      const maxEpoch = epoch + 20;
      
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

      const redirectUri = `${window.location.origin}/report`;
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('response_type', 'id_token');
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('scope', 'openid email');
      authUrl.searchParams.set('nonce', nonce);

      window.location.href = authUrl.toString();
    } catch (error) {
      alert(`Failed to initialize zkLogin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleOAuthCallback = async (idToken: string) => {
    setIsGeneratingProof(true);
    
    try {
      // Step 1: Decode JWT to get user info
      const payload = decodeJwt(idToken);
      
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
        payload.sub,
        payload.aud
      ).toString();

      const zkLoginAddress = computeZkLoginAddressFromSeed(
        BigInt(addressSeed),
        payload.iss
      );
      
      // Step 5: Generate deterministic burner wallet from zkLogin address
      const burnerWallet = await createZkLoginBackedBurner(zkLoginAddress);
      
      // Step 6: Store complete session
      const email = (payload as { email?: string }).email || 'user@gmail.com';
      const session: ZkLoginBurnerSession = {
        zkLoginAddress,
        burnerAddress: burnerWallet.address,
        burnerSecretKey: burnerWallet.secretKeyBase64,
        email,
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
      setUserEmail(email);
      
    } catch (error) {
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
      <div className="flex items-center gap-3 px-5 py-3 bg-sui/10 border border-sui/35 rounded-[var(--radius-ctl)]">
        <span className="w-4 h-4 border-2 border-sui/30 border-t-sui rounded-full animate-spin" />
        <span className="text-sm text-aqua font-mono">Generating zk proof…</span>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <button
        onClick={handleLogin}
        className="inline-flex items-center gap-2 bg-sui text-ink text-sm font-semibold px-5 py-3 rounded-[var(--radius-ctl)] shadow-glow hover:bg-[#5cadff] transition-all cursor-pointer"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
        </svg>
        Sign in with Google
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="px-4 py-2.5 bg-surface-2 border border-line rounded-[var(--radius-ctl)]">
        <div className="flex items-center gap-2 text-[13px]">
          <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse-dot" />
          <span className="text-mid font-medium truncate max-w-[16ch] sm:max-w-none">{userEmail}</span>
        </div>
        <div className="font-mono text-[11px] text-faint mt-0.5">
          {userAddress?.slice(0, 6)}…{userAddress?.slice(-4)}
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="px-3.5 py-2.5 text-[13px] text-low border border-line rounded-[var(--radius-ctl)] hover:text-hi hover:border-sui/40 transition-colors cursor-pointer"
      >
        Sign out
      </button>
    </div>
  );
}