import type { StateStorage } from 'zustand/middleware';

const memoryFallbackStore = new Map<string, string>();

/**
 * Safe storage wrapper that wraps localStorage in try/catch and falls back
 * transparently to an in-memory Map on SecurityError, QuotaExceededError,
 * or SSR/Incognito restrictions.
 */
export const safeStorage: StateStorage = {
  getItem: (name: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const val = window.localStorage.getItem(name);
        if (val !== null) {
          return val;
        }
      }
    } catch {
      // Fallback to in-memory map below
    }
    return memoryFallbackStore.get(name) ?? null;
  },

  setItem: (name: string, value: string): void => {
    memoryFallbackStore.set(name, value);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(name, value);
      }
    } catch {
      // QuotaExceededError or private browsing restriction; kept in memoryFallbackStore
    }
  },

  removeItem: (name: string): void => {
    memoryFallbackStore.delete(name);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(name);
      }
    } catch {
      // Ignore storage error
    }
  },
};

export function readSafeJson<T>(key: string, fallback: T): T {
  const raw = safeStorage.getItem(key) as string | null;
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeSafeJson<T>(key: string, value: T): void {
  try {
    safeStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore serialization error
  }
}

export function clearMemoryFallback(): void {
  memoryFallbackStore.clear();
}
