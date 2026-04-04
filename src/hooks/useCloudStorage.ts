import { useState, useCallback, useEffect, useRef } from 'react';
import { loadFromStorage, saveToStorage } from '../services/storage';
import { cloudLoad, cloudSave } from '../services/supabase';

export function useCloudStorage<T>(key: string, fallback: T): [T, (val: T | ((prev: T) => T)) => void, boolean] {
  const [state, setState] = useState<T>(() => {
    // Start with localStorage (instant), then sync from cloud
    const stored = loadFromStorage<T>(key, fallback);
    if (Array.isArray(stored) && stored.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
      return fallback;
    }
    return stored;
  });

  const [syncing, setSyncing] = useState(true);
  const initialized = useRef(false);

  // On mount: load from Supabase (source of truth)
  useEffect(() => {
    let cancelled = false;
    cloudLoad<T>(key).then(cloudData => {
      if (cancelled) return;
      if (cloudData !== null) {
        // Cloud has data -> use it
        if (Array.isArray(cloudData) && cloudData.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
          // Cloud has empty array but we have defaults -> push defaults to cloud
          cloudSave(key, fallback);
          setState(fallback);
          saveToStorage(key, fallback);
        } else {
          setState(cloudData);
          saveToStorage(key, cloudData);
        }
      } else {
        // Cloud is empty -> push current local state to cloud
        const local = loadFromStorage<T>(key, fallback);
        const toSave = (Array.isArray(local) && local.length === 0 && Array.isArray(fallback) && fallback.length > 0)
          ? fallback : local;
        cloudSave(key, toSave);
        setState(toSave);
      }
      initialized.current = true;
      setSyncing(false);
    }).catch(() => {
      initialized.current = true;
      setSyncing(false);
    });
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
