import React from 'react';
import { FastForward, Rewind } from 'lucide-react';

interface ActionToastsProps {
  toastMessage: string | null;
  rippleSide: 'left' | 'right' | null;
}

/**
 * Renders temporary, non-blocking on-screen toasts for keyboard/control actions
 * and left/right third double-tap seek ripple indicators.
 * Animates strictly via compositor-only `opacity` and `transform`.
 */
export const ActionToasts: React.FC<ActionToastsProps> = React.memo(
  ({ toastMessage, rippleSide }) => {
    return (
      <>
        {/* Temporary Non-Blocking Action Toast */}
        <div
          role="status"
          aria-live="polite"
          data-testid="player-action-toast"
          className={`absolute top-20 left-1/2 -translate-x-1/2 z-30 px-4 py-2 rounded-full bg-black/85 border border-white/25 text-xs sm:text-sm font-bold text-white pointer-events-none transition-opacity duration-150 ${
            toastMessage ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {toastMessage ?? ''}
        </div>

        {/* Touch Double-Tap -10s / +10s Visual Ripple */}
        {rippleSide && (
          <div
            aria-hidden="true"
            data-testid={`player-ripple-${rippleSide}`}
            className={`absolute top-1/2 -translate-y-1/2 z-20 w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex flex-col items-center justify-center gap-1 text-white font-bold text-xs sm:text-sm pointer-events-none transition-opacity duration-200 ${
              rippleSide === 'left' ? 'left-8 sm:left-16' : 'right-8 sm:right-16'
            }`}
          >
            {rippleSide === 'left' ? (
              <>
                <Rewind className="w-6 h-6" />
                <span>-10s</span>
              </>
            ) : (
              <>
                <FastForward className="w-6 h-6" />
                <span>+10s</span>
              </>
            )}
          </div>
        )}
      </>
    );
  }
);

ActionToasts.displayName = 'ActionToasts';
