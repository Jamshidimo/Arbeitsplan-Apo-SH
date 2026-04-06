// AES-256-GCM encryption for localStorage data
// Uses the app PIN to derive an encryption key via PBKDF2

const SALT = 'apoplan-steinhölzli-2024';
const ITERATIONS = 100000;
const SESSION_KEY = 'apoplan_ckey';

let cachedKey: CryptoKey | null = null;

async function deriveKey(pin: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: enc.encode(SALT), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true, // extractable so we can export to sessionStorage
    ['encrypt', 'decrypt']
  );
}

export async function initEncryption(pin: string): Promise<void> {
  cachedKey = await deriveKey(pin);
  // Save raw key to sessionStorage so it survives page reloads
  const exported = await crypto.subtle.exportKey('raw', cachedKey);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  sessionStorage.setItem(SESSION_KEY, b64);
}

export async function restoreEncryption(): Promise<boolean> {
  const b64 = sessionStorage.getItem(SESSION_KEY);
  if (!b64) return false;
  try {
    const raw = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    cachedKey = await crypto.subtle.importKey(
      'raw', raw, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
    return true;
  } catch {
    return false;
  }
}

export function isEncryptionReady(): boolean {
  return cachedKey !== null;
}

export async function encryptData(data: string): Promise<string> {
  if (!cachedKey) throw new Error('Encryption not initialized');
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder();
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    cachedKey,
    enc.encode(data)
  );
  // Combine IV + ciphertext, encode as base64
  const combined = new Uint8Array(iv.length + new Uint8Array(ciphertext).length);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(encrypted: string): Promise<string | null> {
  if (!cachedKey) return null;
  try {
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      cachedKey,
      ciphertext
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}
