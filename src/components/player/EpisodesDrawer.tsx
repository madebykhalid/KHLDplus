import React from 'react';
import { Play, X } from 'lucide-react';
import type { LibraryTitle } from '../../types';
import { formatRuntime } from '../../utils/env';
import { LIBRARY_TITLES, getEpisodesForSeries } from '../../utils/libraryData';

interface EpisodesDrawerProps {
  currentTitle: LibraryTitle;
  onSelectEpisode: (episodeId: string) => void;
  onClose: () => void;
}

export const EpisodesDrawer: React.FC<EpisodesDrawerProps> = ({
  currentTitle,
  onSelectEpisode,
  onClose,
}) => {
  const seriesEpisodes = getEpisodesForSeries(currentTitle.seriesMetadata?.seriesId);
  const list = seriesEpisodes.length > 0 ? seriesEpisodes : LIBRARY_TITLES;

  return (
    <div
      role="dialog"
      aria-label="Episodes and Library Switcher"
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-20 right-4 sm:right-8 z-40 w-[320px] sm:w-[400px] max-h-[70dvh] overflow-y-auto rounded-lg bg-[#181818]/95 backdrop-blur-md border border-white/20 p-4 text-white shadow-2xl space-y-3"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <h3 className="text-sm font-bold">
          {seriesEpisodes.length > 0 ? 'Series Episodes' : 'Library Titles'}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close episodes panel"
          className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded hover:bg-white/10 cursor-pointer"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="space-y-2">
        {list.map((ep, idx) => {
          const isCurrent = ep.id === currentTitle.id;
          return (
            <button
              key={ep.id}
              type="button"
              onClick={() => {
                onSelectEpisode(ep.id);
                onClose();
              }}
              className={`w-full text-left p-3 rounded border transition-opacity flex items-center justify-between gap-3 cursor-pointer ${
                isCurrent
                  ? 'bg-white/15 border-[var(--accent)]'
                  : 'bg-[#141414] border-white/10 hover:border-white/30'
              }`}
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {idx + 1}. {ep.title} ({ep.year})
                </p>
                <p className="text-[11px] text-[#b3b3b3] line-clamp-1 mt-0.5">
                  {ep.overview}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[11px] text-[#b3b3b3] tabular-nums">
                  {formatRuntime(ep.duration)}
                </span>
                <Play className="w-4 h-4 text-white fill-current" aria-hidden="true" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
