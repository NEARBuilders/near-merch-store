import { useEffect, useRef } from 'react';

const PERSISTENCE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface PersistedData<T> {
  values: T;
  timestamp: number;
}

export function useFormPersistence<T extends Record<string, unknown>>(
  form: any,
  storageKey: string,
  options?: {
    enabled?: boolean;
    expireAfterMs?: number;
  }
) {
  const { enabled = true, expireAfterMs = PERSISTENCE_EXPIRY_MS } = options || {};
  const isRestoringRef = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: PersistedData<T> = JSON.parse(saved);
        const now = Date.now();
        
        if (now - parsed.timestamp < expireAfterMs) {
          isRestoringRef.current = true;
          Object.entries(parsed.values).forEach(([key, value]) => {
            form.setFieldValue(key as any, value);
          });
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 0);
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (e) {
        console.error('[useFormPersistence] Failed to restore form:', e);
        localStorage.removeItem(storageKey);
      }
    }
  }, [storageKey, enabled, expireAfterMs]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || isRestoringRef.current) return;

    const unsubscribe = form.store.subscribe(() => {
      const values = form.state.values;
      const hasValues = Object.values(values).some(
        (v) => v !== '' && v !== undefined && v !== null
      );
      
      if (hasValues) {
        const data: PersistedData<T> = {
          values,
          timestamp: Date.now(),
        };
        localStorage.setItem(storageKey, JSON.stringify(data));
      }
    });

    return unsubscribe;
  }, [form, storageKey, enabled]);

  const clearPersistence = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(storageKey);
    }
  };

  return { clearPersistence };
}
