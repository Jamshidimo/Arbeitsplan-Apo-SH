import { useState, useCallback } from 'react';
import { loadFromStorage, saveToStorage } from '../services/storage';

export function useLocalStorage<T>(key: string, fallback: T): [T, (val: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => loadFromStorage(key, fallback));

  const setAndPersist = useCallback((val: T | ((prev: T) => T)) => {
    setState(prev => {
      const next = typeof val === 'function' ? (val as (p: T) => T)(prev) : val;
      saveToStorage(key, next);
      return next;
    });
  }, [key]);

  return [state, setAndPersist];
}
