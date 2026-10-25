import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Film, Play, Plus, ShieldCheck, Star, X } from 'lucide-react';
import { useLibrary } from '../../store/useLibrary';
import type { LibraryTitle } from '../../types';
import { formatRuntime, formatTimecode, isPlaceholderUrl } from '../../utils/env';
import { getEpisodesForSeries, getRelatedTitles } from '../../utils/libraryData';
import { enrichTitleWithTmdbDetails } from '../../utils/tmdb';
import { PosterArtwork } from './PosterArtwork';

interface DetailsModalProps {
  title: LibraryTitle | null;
  onClose: () => void;
  onSelectTitle: (next: LibraryTitle) => void;
}

export const DetailsModal: React.FC<DetailsModalProps> = ({
  title,
  onClose,
  onSelectTitle,
}) => {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const navigate = useNavigate();

  const [enrichedTitle, setEnrichedTitle] = useState<LibraryTitle | null>(title);
  const [playingTrailer, setPlayingTrailer] = useState(false);

  const activeTitle = enrichedTitle ?? title;

  const isInMyList = useLibrary((s) =>
    activeTitle ? s.myList.includes(activeTitle.id) : false
  );
  const toggleMyList = useLibrary((s) => s.toggleMyList);
  const progressEntry = useLibrary((s) =>
    activeTitle ? s.progress[activeTitle.id] : undefined
  );

  // Enrich with live TMDB details/videos/credits when available
  useEffect(() => {
    setEnrichedTitle(title);
    setPlayingTrailer(false);
    if (!title) return;

    const controller = new AbortController();
    void enrichTitleWithTmdbDetails(title, controller.signal).then((updated) => {
      if (!controller.signal.aborted) {
        setEnrichedTitle(updated);
      }
    });

    return () => {
      controller.abort();
    };
  }, [title]);

  // Scroll lock & Focus trap
  useEffect(() => {
    if (!title) return;

    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [title, onClose]);

  if (!activeTitle) return null;

  const episodes = getEpisodesForSeries(
    activeTitle.seriesMetadata?.seriesId ?? 'blender-open-cinema'
  );
  const related = getRelatedTitles(activeTitle, 4);
  const hasValidTrailer = Boolean(
    activeTitle.trailerUrl && !isPlaceholderUrl(activeTitle.trailerUrl)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="details-modal-title"
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 md:p-10"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl rounded-lg bg-[#181818] border border-white/15 overflow-hidden shadow-2xl my-auto"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close details modal"
          className="absolute top-4 right-4 z-30 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#141414]/90 text-white border border-white/25 flex items-center justify-center hover:bg-black transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Backdrop Header or YouTube Nocookie Trailer */}
        <div className="relative aspect-video max-h-[440px] w-full bg-[#141414]">
          {playingTrailer && hasValidTrailer && activeTitle.trailerUrl ? (
            <iframe
              title={`${activeTitle.title} official trailer`}
              src={activeTitle.trailerUrl}
              sandbox="allow-scripts allow-same-origin allow-presentation"
              allow="autoplay; encrypted-media; fullscreen"
              className="w-full h-full"
            />
          ) : (
            <PosterArtwork
              title={activeTitle}
              variant="backdrop"
              showLabels={false}
              className="w-full h-full"
            />
          )}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#181818] via-[#181818]/40 to-transparent pointer-events-none"
          />

          <div className="absolute bottom-6 left-6 right-6 z-20">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#b3b3b3] mb-1.5 tabular-nums">
              <span className="inline-flex items-center gap-1 text-white font-bold">
                <Star className="w-3.5 h-3.5 fill-current text-white" aria-hidden="true" />
                {(activeTitle.voteAverage ?? 8.7).toFixed(1)}
              </span>
              <span aria-hidden="true">·</span>
              <span>{activeTitle.year}</span>
              <span aria-hidden="true">·</span>
              <span>{activeTitle.maturity}</span>
              <span aria-hidden="true">·</span>
              <span>
                {activeTitle.seasonsCount && activeTitle.seasonsCount > 1
                  ? `${activeTitle.seasonsCount} Seasons`
                  : formatRuntime(activeTitle.duration)}
              </span>
            </div>

            <h2
              id="details-modal-title"
              className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-4"
            >
              {activeTitle.title}
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              {!activeTitle.tmdbOnly && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/watch/${activeTitle.id}`);
                  }}
                  className="min-h-[44px] px-6 py-2.5 rounded bg-white text-black font-bold text-sm inline-flex items-center gap-2 hover:bg-white/90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Play className="w-5 h-5 fill-current" aria-hidden="true" />
                  <span>
                    {progressEntry && progressEntry.position > 5
                      ? `Resume (${formatTimecode(progressEntry.position)})`
                      : 'Play'}
                  </span>
                </button>
              )}

              {hasValidTrailer && (
                <button
                  type="button"
                  onClick={() => setPlayingTrailer((prev) => !prev)}
                  className="min-h-[44px] px-5 py-2.5 rounded bg-white/15 border border-white/30 text-white font-semibold text-sm inline-flex items-center gap-2 hover:bg-white/25 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Film className="w-4 h-4" aria-hidden="true" />
                  <span>{playingTrailer ? 'Hide Trailer' : 'Watch Trailer'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => toggleMyList(activeTitle.id)}
                className="min-h-[44px] px-5 py-2.5 rounded bg-white/10 border border-white/25 text-white font-semibold text-sm inline-flex items-center gap-2 hover:bg-white/20 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isInMyList ? (
                  <>
                    <Check className="w-4 h-4" aria-hidden="true" />
                    <span>In My List</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    <span>Add to My List</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 sm:p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              {activeTitle.tagline && (
                <p className="text-xs sm:text-sm italic text-[#b3b3b3]">
                  &ldquo;{activeTitle.tagline}&rdquo;
                </p>
              )}
              <p className="text-sm sm:text-base text-white/90 leading-relaxed">
                {activeTitle.overview}
              </p>

              {/* Legal License & Attribution Notice */}
              <div className="p-4 rounded bg-[#141414] border border-white/10 space-y-1">
                <div className="flex items-center gap-2 text-xs font-semibold text-white">
                  <ShieldCheck className="w-4 h-4 text-white shrink-0" />
                  <span>License &amp; Attribution</span>
                </div>
                <p className="text-xs text-[#b3b3b3]">{activeTitle.license}</p>
                <p className="text-xs text-white/80">{activeTitle.credit}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div>
                <span className="text-[#b3b3b3]">Cast &amp; Crew: </span>
                <span className="text-white">{activeTitle.cast.join(', ')}</span>
              </div>
              <div>
                <span className="text-[#b3b3b3]">Genres: </span>
                <span className="text-white">{activeTitle.genres.join(' · ')}</span>
              </div>
              <div>
                <span className="text-[#b3b3b3]">Audio &amp; Subtitles: </span>
                <span className="text-white">
                  {activeTitle.subtitles.length > 0
                    ? activeTitle.subtitles.map((s) => s.label).join(', ')
                    : 'English (CC)'}
                </span>
              </div>
              <div>
                <span className="text-[#b3b3b3]">Rating: </span>
                <span className="text-white tabular-nums">
                  {(activeTitle.voteAverage ?? 8.7).toFixed(1)} / 10 (
                  {(activeTitle.voteCount ?? 2400).toLocaleString()} votes)
                </span>
              </div>
            </div>
          </div>

          {/* Series Episodes List */}
          {(activeTitle.type === 'episode' || activeTitle.tmdbMediaType === 'tv') &&
            episodes.length > 1 && (
              <div className="pt-4 border-t border-white/10">
                <h3 className="text-lg font-bold text-white mb-4">
                  Episodes &amp; Chapters ({episodes.length})
                </h3>
                <div className="space-y-2.5">
                  {episodes.map((ep, idx) => {
                    const isCurrent = ep.id === activeTitle.id;
                    return (
                      <div
                        key={ep.id}
                        className={`p-3.5 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
                          isCurrent
                            ? 'bg-white/10 border-white/40'
                            : 'bg-[#141414] border-white/10 hover:border-white/25'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-sm font-bold text-[#b3b3b3] tabular-nums mt-0.5">
                            0{ep.seriesMetadata?.episode ?? idx + 1}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-white">
                              {ep.title} ({ep.year})
                            </p>
                            <p className="text-xs text-[#b3b3b3] line-clamp-1 mt-0.5">
                              {ep.overview}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs text-[#b3b3b3] tabular-nums">
                            {formatRuntime(ep.duration)}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              onClose();
                              navigate(`/watch/${ep.id}`);
                            }}
                            aria-label={`Play ${ep.title}`}
                            className="min-h-[40px] px-3.5 py-1.5 rounded bg-white text-black text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer"
                          >
                            Play
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* More Like This */}
          {related.length > 0 && (
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-lg font-bold text-white mb-4">More Like This</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {related.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onSelectTitle(item)}
                    className="group text-left rounded bg-[#141414] border border-white/10 overflow-hidden hover:border-white/30 transition-opacity focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
                  >
                    <div className="aspect-video w-full">
                      <PosterArtwork title={item} variant="backdrop" />
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-bold text-white truncate">{item.title}</p>
                      <p className="text-[11px] text-[#b3b3b3] mt-0.5 tabular-nums">
                        {item.year} · {formatRuntime(item.duration)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
