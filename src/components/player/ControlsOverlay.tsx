import React from 'react';
import {
  ArrowLeft,
  Captions,
  FastForward,
  Gauge,
  Layers,
  ListVideo,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Rewind,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { LibraryTitle, VideoQuality } from '../../types';
import { formatTimecode } from '../../utils/env';
import { SeekBar } from './SeekBar';

export type ActivePlayerPanel = 'none' | 'subtitles' | 'episodes' | 'speed' | 'quality';

interface ControlsOverlayProps {
  title: LibraryTitle;
  controlsVisible: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  volume: number;
  speed: number;
  selectedQuality: VideoQuality;
  subtitleLang: string;
  isFullscreen: boolean;
  activePanel: ActivePlayerPanel;
  progressFillRef: React.RefObject<HTMLDivElement | null>;
  bufferedFillRef: React.RefObject<HTMLDivElement | null>;
  thumbRef: React.RefObject<HTMLDivElement | null>;
  currentTimeLabelRef: React.RefObject<HTMLSpanElement | null>;
  durationLabelRef: React.RefObject<HTMLSpanElement | null>;
  onBack: () => void;
  onTogglePlayPause: () => void;
  onSeekTo: (seconds: number) => void;
  onSeekRelative: (deltaSeconds: number) => void;
  onToggleMute: () => void;
  onVolumeChange: (nextVolume: number) => void;
  onTogglePanel: (panel: Exclude<ActivePlayerPanel, 'none'>) => void;
  onTogglePiP: () => void;
  onToggleFullscreen: () => void;
  onNextEpisode: () => void;
}

/**
 * Isolated Top & Bottom Control Bars for the Player.
 * Uses direct DOM refs (`currentTimeLabelRef`, `durationLabelRef`, `progressFillRef`, `bufferedFillRef`, `thumbRef`)
 * so 60fps playback never causes React state re-renders.
 * Always remains visible when `isPaused` is true, and auto-hides after 3000ms of inactivity while playing.
 */
export const ControlsOverlay: React.FC<ControlsOverlayProps> = React.memo(
  ({
    title,
    controlsVisible,
    isPlaying,
    isPaused,
    isMuted,
    volume,
    speed,
    selectedQuality,
    subtitleLang,
    isFullscreen,
    activePanel,
    progressFillRef,
    bufferedFillRef,
    thumbRef,
    currentTimeLabelRef,
    durationLabelRef,
    onBack,
    onTogglePlayPause,
    onSeekTo,
    onSeekRelative,
    onToggleMute,
    onVolumeChange,
    onTogglePanel,
    onTogglePiP,
    onToggleFullscreen,
    onNextEpisode,
  }) => {
    const visible = controlsVisible || isPaused || !isPlaying;

    return (
      <>
        {/* Top Bar: Back Arrow + Title */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-0 inset-x-0 z-30 p-4 sm:p-6 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between gap-4 transition-opacity duration-200 pt-safe ${
            visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to browse"
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-black/60 hover:bg-black/90 border border-white/15 text-white flex items-center justify-center transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-lg font-bold text-white truncate">
                {title.title}
              </h1>
              <p className="text-xs text-[#b3b3b3] truncate">
                {title.year} · {title.maturity} · {title.license}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Control Bar: Gradient Overlay Fading to Transparent */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-0 inset-x-0 z-30 px-4 sm:px-6 pb-4 pt-10 bg-gradient-to-t from-black/95 via-black/70 to-transparent transition-opacity duration-200 pb-safe ${
            visible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Custom DOM SeekBar */}
          <SeekBar
            duration={title.duration}
            progressFillRef={progressFillRef}
            bufferedFillRef={bufferedFillRef}
            thumbRef={thumbRef}
            onSeek={onSeekTo}
          />

          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
            {/* Left Controls: Play/Pause, Skip Backward 10s, Skip Forward 10s, Volume (hover expands to slider), Elapsed/Duration Time */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={onTogglePlayPause}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded flex items-center justify-center text-white hover:bg-white/15 transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 fill-current" aria-hidden="true" />
                ) : (
                  <Play className="w-6 h-6 fill-current" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onSeekRelative(-10)}
                aria-label="Rewind 10 seconds"
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded flex items-center justify-center text-white hover:bg-white/15 transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
              >
                <Rewind className="w-5 h-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onSeekRelative(10)}
                aria-label="Forward 10 seconds"
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded flex items-center justify-center text-white hover:bg-white/15 transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
              >
                <FastForward className="w-5 h-5" aria-hidden="true" />
              </button>

              {/* Volume Group: Icon expands to slider on hover / focus-within */}
              <div className="group/vol flex items-center">
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-label={isMuted || volume === 0 ? 'Unmute' : 'Mute'}
                  className="min-w-[44px] min-h-[44px] w-11 h-11 rounded flex items-center justify-center text-white hover:bg-white/15 transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5" aria-hidden="true" />
                  ) : (
                    <Volume2 className="w-5 h-5" aria-hidden="true" />
                  )}
                </button>
                <div className="w-0 overflow-hidden opacity-0 group-hover/vol:w-20 group-hover/vol:opacity-100 focus-within:w-20 focus-within:opacity-100 transition-opacity duration-150 flex items-center">
                  <label htmlFor="player-volume-slider" className="sr-only">
                    Volume
                  </label>
                  <input
                    id="player-volume-slider"
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => onVolumeChange(Number(e.target.value))}
                    className="w-20 accent-white cursor-pointer"
                  />
                </div>
              </div>

              {/* Elapsed Time / Total Duration updated strictly via direct DOM ref writes */}
              <div className="text-xs sm:text-sm text-white/90 font-medium tabular-nums pl-2">
                <span ref={currentTimeLabelRef} data-testid="player-elapsed-time">
                  0:00
                </span>
                <span className="text-[#b3b3b3] mx-1">/</span>
                <span ref={durationLabelRef} className="text-[#b3b3b3]">
                  {formatTimecode(title.duration)}
                </span>
              </div>
            </div>

            {/* Right Controls: Next Episode, Episodes, Subtitles, Speed, Quality, PiP, Fullscreen */}
            <div className="flex items-center gap-1 sm:gap-1.5">
              {title.nextEpisodeId && (
                <button
                  type="button"
                  onClick={onNextEpisode}
                  aria-label="Next Episode"
                  className="min-h-[44px] px-3 rounded flex items-center gap-1.5 text-xs font-bold text-white hover:bg-white/15 transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Next</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => onTogglePanel('episodes')}
                aria-label="Episodes and Library panel"
                aria-expanded={activePanel === 'episodes'}
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded flex items-center justify-center transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer ${
                  activePanel === 'episodes'
                    ? 'bg-white/25 text-white'
                    : 'text-white hover:bg-white/15'
                }`}
              >
                <ListVideo className="w-5 h-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onTogglePanel('subtitles')}
                aria-label="Subtitles and Audio settings"
                aria-expanded={activePanel === 'subtitles'}
                className={`min-w-[44px] min-h-[44px] w-11 h-11 rounded flex items-center justify-center transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer ${
                  activePanel === 'subtitles' || subtitleLang !== 'off'
                    ? 'bg-white/20 text-white'
                    : 'text-white hover:bg-white/15'
                }`}
              >
                <Captions className="w-5 h-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onTogglePanel('speed')}
                aria-label={`Playback speed ${speed}x`}
                aria-expanded={activePanel === 'speed'}
                className="min-h-[44px] px-2.5 rounded flex items-center gap-1 text-xs font-bold text-white hover:bg-white/15 transition-opacity focus-visible:outline-2 focus-visible:outline-white tabular-nums cursor-pointer"
              >
                <Gauge className="w-4 h-4" aria-hidden="true" />
                <span>{speed}x</span>
              </button>

              <button
                type="button"
                onClick={() => onTogglePanel('quality')}
                aria-label={`Stream quality ${selectedQuality}`}
                aria-expanded={activePanel === 'quality'}
                className="min-h-[44px] px-2.5 rounded flex items-center gap-1 text-xs font-bold text-white hover:bg-white/15 transition-opacity focus-visible:outline-2 focus-visible:outline-white tabular-nums cursor-pointer"
              >
                <Layers className="w-4 h-4" aria-hidden="true" />
                <span>{selectedQuality}</span>
              </button>

              <button
                type="button"
                onClick={onTogglePiP}
                aria-label="Toggle Picture-in-Picture"
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded flex items-center justify-center text-white hover:bg-white/15 transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
              >
                <PictureInPicture2 className="w-5 h-5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onToggleFullscreen}
                aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded flex items-center justify-center text-white hover:bg-white/15 transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
              >
                {isFullscreen ? (
                  <Minimize className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Maximize className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
);

ControlsOverlay.displayName = 'ControlsOverlay';
