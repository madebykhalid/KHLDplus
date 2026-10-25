import { useEffect } from 'react';
import type { LibraryTitle } from '../types';
import { isPlaceholderUrl } from '../utils/env';

interface MediaSessionHandlers {
  title: LibraryTitle;
  isPlaying: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeekBackward: () => void;
  onSeekForward: () => void;
  onNextTrack?: () => void;
}

/**
 * Integrates the W3C Media Session API for hardware media keys, lock-screen controls,
 * and Picture-in-Picture controls. Cleans up all action handlers on unmount.
 */
export function useMediaSession({
  title,
  isPlaying,
  onPlay,
  onPause,
  onSeekBackward,
  onSeekForward,
  onNextTrack,
}: MediaSessionHandlers): void {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }

    const session = navigator.mediaSession;
    const artwork = !isPlaceholderUrl(title.poster)
      ? [{ src: title.poster, sizes: '512x512', type: 'image/jpeg' }]
      : [];

    try {
      session.metadata = new MediaMetadata({
        title: title.title,
        artist: title.credit,
        album: `${title.year} · ${title.license}`,
        artwork,
      });
    } catch {
      // Ignore unsupported MediaMetadata constructor in older environments
    }

    const actions: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
      ['play', onPlay],
      ['pause', onPause],
      ['seekbackward', onSeekBackward],
      ['seekforward', onSeekForward],
      ['nexttrack', onNextTrack ?? null],
    ];

    for (const [action, handler] of actions) {
      try {
        session.setActionHandler(action, handler);
      } catch {
        // Ignore unsupported action types
      }
    }

    return () => {
      for (const [action] of actions) {
        try {
          session.setActionHandler(action, null);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [title, onPlay, onPause, onSeekBackward, onSeekForward, onNextTrack]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    try {
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
    } catch {
      // Ignore
    }
  }, [isPlaying]);
}
