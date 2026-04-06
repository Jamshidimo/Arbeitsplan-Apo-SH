import { encryptData, decryptData, isEncryptionReady } from './crypto';

const ENCRYPTED_PREFIX = 'ENC:';

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    // If data is encrypted, we can't read it synchronously at startup
    // The async version (loadFromStorageAsync) handles decryption
    if (raw.startsWith(ENCRYPTED_PREFIX)) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export async function loadFromStorageAsync<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    if (raw.startsWith(ENCRYPTED_PREFIX)) {
      const decrypted = await decryptData(raw.slice(ENCRYPTED_PREFIX.length));
      if (decrypted) return JSON.parse(decrypted);
      return fallback;
    }
    // Legacy unencrypted data - parse and re-save encrypted
    const parsed = JSON.parse(raw);
    if (isEncryptionReady()) {
      const encrypted = await encryptData(JSON.stringify(parsed));
      localStorage.setItem(key, ENCRYPTED_PREFIX + encrypted);
    }
    return parsed;
  } catch {
    return fallback;
  }
}

export async function saveToStorage<T>(key: string, data: T): Promise<void> {
  const json = JSON.stringify(data);
  if (isEncryptionReady()) {
    const encrypted = await encryptData(json);
    localStorage.setItem(key, ENCRYPTED_PREFIX + encrypted);
  } else {
    localStorage.setItem(key, json);
  }
}
