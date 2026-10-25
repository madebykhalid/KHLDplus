interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationLike;
  mozConnection?: NetworkInformationLike;
  webkitConnection?: NetworkInformationLike;
}

/**
 * Checks whether the user has requested reduced motion via OS/browser settings.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Checks whether Data Saver mode (`navigator.connection.saveData`) is enabled.
 */
export function isSaveDataEnabled(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }
  const nav = navigator as NavigatorWithConnection;
  const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
  return Boolean(conn?.saveData);
}

/**
 * Returns true if either reduced motion or saveData is active (disables trailer autoplay & prefetching).
 */
export function shouldConserveBandwidthOrMotion(): boolean {
  return prefersReducedMotion() || isSaveDataEnabled();
}

/**
 * Checks whether a URL string is a MUST_FILL_URL placeholder or empty.
 */
export function isPlaceholderUrl(url: string | undefined | null): boolean {
  if (!url) return true;
  const trimmed = url.trim();
  return trimmed.length === 0 || trimmed.startsWith('MUST_FILL_URL');
}

/**
 * Formats seconds into human-readable duration (e.g. "1h 36m" or "14m 48s").
 */
export function formatRuntime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m';
  const totalSec = Math.round(seconds);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;
  if (hrs > 0) {
    return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
  }
  if (mins >= 20) {
    return `${mins}m`;
  }
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

/**
 * Formats seconds into player timecode (MM:SS or HH:MM:SS).
 */
export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const secStr = secs < 10 ? `0${secs}` : `${secs}`;
  if (hrs > 0) {
    const minStr = mins < 10 ? `0${mins}` : `${mins}`;
    return `${hrs}:${minStr}:${secStr}`;
  }
  return `${mins}:${secStr}`;
}
