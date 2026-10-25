import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Info, Play, Plus, RotateCcw, Star, X } from 'lucide-react';
import { useLibrary } from '../../store/useLibrary';
import type { LibraryTitle, WatchProgressEntry } from '../../types';
import { formatRuntime, formatTimecode } from '../../utils/env';
import { PosterArtwork } from './PosterArtwork';

interface TitleCardProps {
  title: LibraryTitle;
  layout: 'row' | 'grid';
  onSelectDetails: (title: LibraryTitle) => void;
  progressEntry?: WatchProgressEntry;
  onRemoveContinueWatching?: (titleId: string) => void;
}

export const TitleCard: React.FC<TitleCardProps> = React.memo(
  ({
    title,
    layout,
    onSelectDetails,
    progressEntry,
    onRemoveContinueWatching,
  }) => {
    const navigate = useNavigate();
    const isInMyList = useLibrary((s) => s.myList.includes(title.id));
    const toggleMyList = useLibrary((s) => s.toggleMyList);
    const updateProgress = useLibrary((s) => s.updateProgress);

    const isContinueWatchingCard = Boolean(onRemoveContinueWatching && progressEntry);

    const progressPercent =
      progressEntry && progressEntry.duration > 0
        ? Math.min(
            100,
            Math.max(
              2,
              Math.round((progressEntry.position / progressEntry.duration) * 100)
            )
          )
        : 0;

    const remainingSeconds =
      progressEntry && progressEntry.duration > progressEntry.position
        ? Math.max(0, Math.round(progressEntry.duration - progressEntry.position))
        : 0;

    const remainingMinutesLabel =
      remainingSeconds >= 60
        ? `${Math.ceil(remainingSeconds / 60)}m left`
        : `${remainingSeconds}s left`;

    const handlePlayClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (title.tmdbOnly) {
        onSelectDetails(title);
        return;
      }
      navigate(`/watch/${title.id}`);
    };

    const handleRestartClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (title.tmdbOnly) return;
      updateProgress(title.id, 1, title.duration);
      navigate(`/watch/${title.id}`);
    };

    const handleToggleList = (e: React.MouseEvent) => {
      e.stopPropagation();
      toggleMyList(title.id);
    };

    const handleRemoveProgress = (e: React.MouseEvent) => {
      e.stopPropagation();
      onRemoveContinueWatching?.(title.id);
    };

    return (
      <article
        className={`group relative rounded bg-[#1f1f1f] overflow-hidden border border-white/10 streamly-card-hover ${
          layout === 'row' ? 'aspect-video w-full' : 'aspect-[2/3] w-full'
        }`}
      >
        {/* Main clickable surface: resumes playback directly for Continue Watching cards, or opens details modal */}
        <button
          type="button"
          onClick={() => {
            if (isContinueWatchingCard && !title.tmdbOnly) {
              navigate(`/watch/${title.id}`);
            } else {
              onSelectDetails(title);
            }
          }}
          aria-label={
            isContinueWatchingCard && progressEntry
              ? `Resume watching ${title.title} at ${formatTimecode(progressEntry.position)}`
              : `View details for ${title.title} (${title.year})`
          }
          className="w-full h-full text-left block focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-white cursor-pointer"
        >
          <PosterArtwork
            title={title}
            variant={layout === 'row' ? 'backdrop' : 'poster'}
          />

          {/* Centered Netflix-style Play badge on Continue Watching row cards */}
          {isContinueWatchingCard && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/25 group-hover:opacity-0 transition-opacity pointer-events-none">
              <div className="w-11 h-11 rounded-full bg-black/80 border-2 border-white flex items-center justify-center shadow-lg">
                <Play className="w-5 h-5 text-white fill-current ml-0.5" aria-hidden="true" />
              </div>
            </div>
          )}
        </button>

        {/* Netflix-style Continue Watching bottom progress bar + remaining time (opaque base prevents text overlap) */}
        {isContinueWatchingCard && progressEntry && progressPercent > 0 && (
          <div className="absolute bottom-0 inset-x-0 z-20 bg-[#141414]/95 border-t border-white/10 px-3 py-2 pointer-events-none">
            <div className="flex items-center justify-between text-[11px] font-semibold text-white mb-1.5 tabular-nums">
              <span>Resume {formatTimecode(progressEntry.position)}</span>
              <span className="text-[#b3b3b3]">{remainingMinutesLabel}</span>
            </div>
            <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden">
              <div
                className="h-full bg-white"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Subtle progress bar for watched items appearing in other rows */}
        {!isContinueWatchingCard && progressEntry && progressPercent > 0 && (
          <div className="absolute bottom-0 inset-x-0 z-20 h-1 bg-black/80 pointer-events-none">
            <div
              className="h-full bg-white"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {/* Hover / Focus-Within Mini Panel */}
        <div className="streamly-card-mini-panel absolute inset-0 z-20 bg-gradient-to-t from-black/95 via-black/75 to-black/25 p-3.5 flex flex-col justify-end">
          <div className="flex items-center gap-2 mb-2">
            {!title.tmdbOnly && (
              <button
                type="button"
                onClick={handlePlayClick}
                aria-label={
                  progressEntry
                    ? `Resume ${title.title} at ${formatTimecode(progressEntry.position)}`
                    : `Play ${title.title}`
                }
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-white text-black flex items-center justify-center hover:opacity-90 transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current ml-0.5" aria-hidden="true" />
              </button>
            )}

            {progressEntry && !title.tmdbOnly && (
              <button
                type="button"
                onClick={handleRestartClick}
                aria-label={`Restart ${title.title} from beginning`}
                title="Start from beginning"
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#141414]/90 border border-white/40 text-white flex items-center justify-center hover:border-white transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              onClick={handleToggleList}
              aria-label={
                isInMyList
                  ? `Remove ${title.title} from My List`
                  : `Add ${title.title} to My List`
              }
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#141414]/90 border border-white/40 text-white flex items-center justify-center hover:border-white transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
            >
              {isInMyList ? (
                <Check className="w-5 h-5" aria-hidden="true" />
              ) : (
                <Plus className="w-5 h-5" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => onSelectDetails(title)}
              aria-label={`More info about ${title.title}`}
              className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#141414]/90 border border-white/40 text-white flex items-center justify-center hover:border-white transition-opacity ml-auto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
            >
              <Info className="w-5 h-5" aria-hidden="true" />
            </button>

            {onRemoveContinueWatching && progressEntry && (
              <button
                type="button"
                onClick={handleRemoveProgress}
                aria-label={`Remove ${title.title} from Continue Watching`}
                title="Remove from Continue Watching"
                className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-[#141414]/90 border border-white/40 text-white flex items-center justify-center hover:border-white transition-opacity focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <p className="text-sm font-bold text-white truncate">{title.title}</p>
          <div className="flex items-center gap-1.5 text-xs text-[#b3b3b3] mt-0.5 tabular-nums">
            <span className="inline-flex items-center gap-0.5 text-white font-semibold">
              <Star className="w-3 h-3 fill-current" aria-hidden="true" />
              {(title.voteAverage ?? 8.6).toFixed(1)}
            </span>
            <span aria-hidden="true">·</span>
            <span>{title.year}</span>
            <span aria-hidden="true">·</span>
            <span>{title.maturity}</span>
            <span aria-hidden="true">·</span>
            <span>
              {progressEntry
                ? `${formatTimecode(progressEntry.position)} / ${formatTimecode(progressEntry.duration)}`
                : title.seasonsCount && title.seasonsCount > 1
                  ? `${title.seasonsCount} Seasons`
                  : formatRuntime(title.duration)}
            </span>
          </div>
          <p className="text-[11px] text-[#b3b3b3] truncate mt-0.5">
            {title.genres.slice(0, 3).join(' · ')}
          </p>
        </div>
      </article>
    );
  }
);

TitleCard.displayName = 'TitleCard';
