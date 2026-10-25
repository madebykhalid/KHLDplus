import { useEffect, useState } from 'react';

/**
 * Debounces a rapidly changing value (e.g. search input at 350ms).
 * Cleans up pending timer on every change and on unmount.
 */
export function useDebounce<T>(value: T, delayMs = 350): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delayMs);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [value, delayMs]);

  return debouncedValue;
}
