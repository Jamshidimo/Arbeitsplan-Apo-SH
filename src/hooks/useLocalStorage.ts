import { useState, useCallback } from 'react';
import { loadFromStorage, saveToStorage } from '../services/storage';

export function useLocalStorage<T>(key: string, fallback: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    const stored = loadFromStorage<T>(key, fallback);
    // If stored value is an empty array but fallback has items, use fallback
    if (Array.isArray(stored) && stored.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
      saveToStorage(key, fallback);
      return fallback;
    }
    return stored;
  });

  const setAndPersist = useCallback((val: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof val === 'function' ? (val as (p: T) => T)(prev) : val;
      saveToStorage(key, next);
      return next;
    });
  }, [key]);

  return [state, setAndPersist];
}
