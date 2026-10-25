import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Info, Play, Plus, Star } from 'lucide-react';
import { useLibrary } from '../../store/useLibrary';
import type { LibraryTitle } from '../../types';
import {
  formatRuntime,
  isPlaceholderUrl,
  shouldConserveBandwidthOrMotion,
} from '../../utils/env';
import { PosterArtwork } from './PosterArtwork';

interface HeroBannerProps {
  title: LibraryTitle;
  onMoreInfo: (title: LibraryTitle) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = React.memo(({ title, onMoreInfo }) => {
  const navigate = useNavigate();
  const [showTrailer, setShowTrailer] = useState(false);
  const isInMyList = useLibrary((s) => s.myList.includes(title.id));
  const toggleMyList = useLibrary((s) => s.toggleMyList);

  // Muted trailer only after 3s on desktop when not reduced-motion / save-data and trailerUrl is valid
  useEffect(() => {
    setShowTrailer(false);
    if (
      !title.trailerUrl ||
      isPlaceholderUrl(title.trailerUrl) ||
      shouldConserveBandwidthOrMotion() ||
      typeof window === 'undefined' ||
      window.innerWidth < 1024
    ) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setShowTrailer(true);
    }, 3000);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [title]);

  return (
    <section
      aria-label={`Featured title: ${title.title}`}
      className="relative w-full h-[70dvh] min-h-[460px] max-h-[800px] bg-[#141414] overflow-hidden select-none"
    >
      {/* Static Backdrop Artwork or Delayed Muted Trailer */}
      <div className="absolute inset-0">
        {showTrailer && title.trailerUrl ? (
          <iframe
            title={`${title.title} muted preview trailer`}
            src={title.trailerUrl}
            sandbox="allow-scripts allow-same-origin"
            allow="autoplay; encrypted-media"
            className="w-full h-full object-cover pointer-events-none"
          />
        ) : (
          <PosterArtwork
            title={title}
            variant="backdrop"
            priority={true}
            showLabels={false}
            className="w-full h-full"
          />
        )}
      </div>

      {/* Measured contrast scrims */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-[#141414] via-[#141414]/80 to-transparent"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/25 to-transparent"
      />

      {/* Foreground Content */}
      <div className="relative z-10 max-w-[1920px] mx-auto h-full px-4 sm:px-8 lg:px-14 flex flex-col justify-end pb-14 sm:pb-20">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-[#b3b3b3] mb-2.5 tabular-nums">
            <span className="text-white font-bold tracking-wide">KHLD+ FEATURED</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1 text-white font-semibold">
              <Star className="w-3.5 h-3.5 fill-current text-white" aria-hidden="true" />
              {(title.voteAverage ?? 8.9).toFixed(1)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{title.year}</span>
            <span aria-hidden="true">·</span>
            <span>{title.maturity}</span>
            <span aria-hidden="true">·</span>
            <span>{formatRuntime(title.duration)}</span>
            <span aria-hidden="true">·</span>
            <span>{title.genres.slice(0, 3).join(' / ')}</span>
          </div>

          <h1
            className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white mb-3 leading-[1.06]"
            style={{ textWrap: 'balance' }}
          >
            {title.title}
          </h1>

          <p className="text-sm sm:text-base text-white/90 line-clamp-3 leading-relaxed max-w-xl mb-6">
            {title.overview}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            {!title.tmdbOnly && (
              <button
                type="button"
                onClick={() => navigate(`/watch/${title.id}`)}
                className="min-h-[44px] px-7 py-2.5 rounded bg-white text-black font-bold text-sm sm:text-base inline-flex items-center gap-2.5 hover:bg-white/90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" aria-hidden="true" />
                <span>Play</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onMoreInfo(title)}
              className="min-h-[44px] px-6 py-2.5 rounded bg-white/15 border border-white/25 text-white font-bold text-sm sm:text-base inline-flex items-center gap-2.5 hover:bg-white/25 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Info className="w-5 h-5" aria-hidden="true" />
              <span>More Info</span>
            </button>

            <button
              type="button"
              onClick={() => toggleMyList(title.id)}
              aria-label={
                isInMyList
                  ? `Remove ${title.title} from My List`
                  : `Add ${title.title} to My List`
              }
              className="min-h-[44px] px-5 py-2.5 rounded bg-transparent border border-white/30 text-white font-semibold text-sm sm:text-base inline-flex items-center gap-2 hover:border-white transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isInMyList ? (
                <>
                  <Check className="w-4 h-4" aria-hidden="true" />
                  <span>In My List</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  <span>My List</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
});

HeroBanner.displayName = 'HeroBanner';
