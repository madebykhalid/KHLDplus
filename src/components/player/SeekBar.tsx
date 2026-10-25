import React, { useRef, useState } from 'react';
import { formatTimecode } from '../../utils/env';

interface SeekBarProps {
  duration: number;
  progressFillRef: React.RefObject<HTMLDivElement | null>;
  bufferedFillRef: React.RefObject<HTMLDivElement | null>;
  thumbRef: React.RefObject<HTMLDivElement | null>;
  onSeek: (targetSeconds: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: () => void;
}

/**
 * High-performance custom seek bar driven strictly by direct DOM ref writes
 * from `requestAnimationFrame` and Pointer Events (`useRef`), avoiding 60fps React re-renders.
 */
export const SeekBar: React.FC<SeekBarProps> = React.memo(
  ({
    duration,
    progressFillRef,
    bufferedFillRef,
    thumbRef,
    onSeek,
    onScrubStart,
    onScrubEnd,
  }) => {
    const trackRef = useRef<HTMLDivElement | null>(null);
    const hoverTooltipRef = useRef<HTMLDivElement | null>(null);
    const hoverTimeTextRef = useRef<HTMLSpanElement | null>(null);
    const isDraggingRef = useRef<boolean>(false);
    const lastHoverRatioRef = useRef<number>(0);

    // Coarse state only for drag active styling
    const [isDragging, setIsDragging] = useState(false);

    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 600;

    const computeTimeFromClientX = (clientX: number): { ratio: number; seconds: number } => {
      const track = trackRef.current;
      if (!track) return { ratio: 0, seconds: 0 };
      const rect = track.getBoundingClientRect();
      const rawRatio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
      const ratio = Math.max(0, Math.min(1, rawRatio));
      return { ratio, seconds: ratio * safeDuration };
    };

    const updateHoverTooltipDom = (ratio: number | null) => {
      const tooltip = hoverTooltipRef.current;
      const label = hoverTimeTextRef.current;
      if (!tooltip || !label) return;

      if (ratio === null) {
        tooltip.style.opacity = '0';
        return;
      }

      lastHoverRatioRef.current = ratio;
      const clampedPercent = Math.max(3, Math.min(97, ratio * 100));
      tooltip.style.left = `${clampedPercent}%`;
      tooltip.style.opacity = '1';
      label.textContent = formatTimecode(ratio * safeDuration);
    };

    const updateSeekDomImmediate = (ratio: number) => {
      if (progressFillRef.current) {
        progressFillRef.current.style.transform = `scaleX(${ratio})`;
      }
      if (thumbRef.current) {
        thumbRef.current.style.left = `${ratio * 100}%`;
      }
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      setIsDragging(true);
      onScrubStart?.();

      const { ratio, seconds } = computeTimeFromClientX(e.clientX);
      updateHoverTooltipDom(ratio);
      updateSeekDomImmediate(ratio);
      onSeek(seconds);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
      const { ratio, seconds } = computeTimeFromClientX(e.clientX);
      updateHoverTooltipDom(ratio);

      if (!isDraggingRef.current) return;
      updateSeekDomImmediate(ratio);
      onSeek(seconds);
    };

    const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
      try {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      } catch {
        // Ignore pointer capture release errors
      }
      onScrubEnd?.();
    };

    return (
      <div
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label="Seek timeline"
        aria-valuemin={0}
        aria-valuemax={Math.round(safeDuration)}
        data-testid="player-seekbar"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onPointerLeave={() => updateHoverTooltipDom(null)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') {
            e.preventDefault();
            e.stopPropagation();
            onSeek(Math.min(safeDuration, lastHoverRatioRef.current * safeDuration + 10));
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            e.stopPropagation();
            onSeek(Math.max(0, lastHoverRatioRef.current * safeDuration - 10));
          }
        }}
        className="group/seek relative w-full h-7 flex items-center cursor-pointer select-none touch-none focus-visible:outline-2 focus-visible:outline-white rounded"
      >
        {/* Hover Timecode Preview (updated strictly via direct DOM ref) */}
        <div
          ref={hoverTooltipRef}
          aria-hidden="true"
          className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 border border-white/25 text-[11px] font-mono font-bold text-white tabular-nums pointer-events-none opacity-0 transition-opacity duration-100"
          style={{ left: '0%' }}
        >
          <span ref={hoverTimeTextRef}>0:00</span>
        </div>

        {/* Track Rail (grows on hover/drag via scaleY transform) */}
        <div
          className={`relative w-full h-1.5 bg-white/25 rounded-full overflow-hidden transition-transform duration-150 ${
            isDragging ? 'scale-y-150' : 'group-hover/seek:scale-y-150'
          }`}
        >
          {/* Buffered Range Bar */}
          <div
            ref={bufferedFillRef}
            className="absolute inset-y-0 left-0 w-full bg-white/40 origin-left"
            style={{ transform: 'scaleX(0)' }}
          />

          {/* Monochromatic White Progress Fill */}
          <div
            ref={progressFillRef}
            data-testid="player-seekbar-fill"
            className="absolute inset-y-0 left-0 w-full bg-white origin-left"
            style={{ transform: 'scaleX(0)' }}
          />
        </div>

        {/* Draggable Thumb (positioned via thumbRef.current.style.left) */}
        <div
          ref={thumbRef}
          data-testid="player-seekbar-thumb"
          className={`
            absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]
            transition-transform duration-150 pointer-events-none
            ${
              isDragging
                ? 'scale-125 opacity-100'
                : 'scale-90 opacity-90 group-hover/seek:scale-110 group-hover/seek:opacity-100'
            }
          `}
          style={{ left: '0%' }}
        />
      </div>
    );
  }
);

SeekBar.displayName = 'SeekBar';
