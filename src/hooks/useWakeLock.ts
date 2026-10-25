import { useEffect } from 'react';

/**
 * Requests a Screen Wake Lock while video playback is active so the display
 * does not dim or sleep mid-movie. Releases the lock when paused, hidden, or unmounted.
 */
export function useWakeLock(isActive: boolean): void {
  useEffect(() => {
    if (
      !isActive ||
      typeof navigator === 'undefined' ||
      !('wakeLock' in navigator) ||
      !navigator.wakeLock
    ) {
      return;
    }

    let isCancelled = false;
    let sentinel: WakeLockSentinel | null = null;

    const acquireLock = async () => {
      if (isCancelled || document.visibilityState !== 'visible') return;
      try {
        const lock = await navigator.wakeLock.request('screen');
        if (isCancelled) {
          await lock.release();
        } else {
          sentinel = lock;
        }
      } catch {
        // Wake lock request may be denied by battery saver or browser policy; fail silently
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isActive) {
        void acquireLock();
      }
    };

    void acquireLock();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sentinel && !sentinel.released) {
        void sentinel.release().catch(() => {});
      }
    };
  }, [isActive]);
}
