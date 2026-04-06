import { useState, useCallback, useEffect, useRef } from 'react';
import { loadFromStorageAsync, saveToStorage } from '../services/storage';
import { cloudLoad, cloudSave } from '../services/supabase';

export function useCloudStorage<T>(key: string, fallback: T): [T, (val: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(fallback);
  const [syncing, setSyncing] = useState(true);
  const initialized = useRef(false);

  // On mount: load from encrypted localStorage, then sync from cloud
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // First load from encrypted localStorage
      const local = await loadFromStorageAsync<T>(key, fallback);
      if (cancelled) return;

      const localIsEmpty = Array.isArray(local) && local.length === 0;
      const hasDefaults = Array.isArray(fallback) && fallback.length > 0;

      if (!localIsEmpty || !hasDefaults) {
        setState(local);
      }

      // Then sync from cloud (source of truth)
      try {
        const cloudData = await cloudLoad<T>(key);
        if (cancelled) return;
        if (cloudData !== null) {
          const cloudIsEmpty = Array.isArray(cloudData) && cloudData.length === 0;
          if (cloudIsEmpty && hasDefaults) {
            cloudSave(key, fallback);
            setState(fallback);
            saveToStorage(key, fallback);
          } else {
            setState(cloudData);
            saveToStorage(key, cloudData);
          }
        } else {
          const toSave = (localIsEmpty && hasDefaults) ? fallback : local;
          cloudSave(key, toSave);
          setState(toSave);
        }
      } catch {
        // Cloud unavailable, local data is fine
      }
      initialized.current = true;
      setSyncing(false);
    }

    init();
    return () => { cancelled = true; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const setAndSync = useCallback((val: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof val === 'function' ? (val as (p: T) => T)(prev) : val;
      saveToStorage(key, next);
      cloudSave(key, next); // fire and forget
      return next;
    });
  }, [key]);

  return [state, setAndSync, syncing];
}
