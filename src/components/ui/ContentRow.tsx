import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useInView } from '../../hooks/useInView';
import type { LibraryTitle, WatchProgressEntry } from '../../types';
import { RowSkeleton } from './Skeleton';
import { TitleCard } from './TitleCard';

interface ContentRowProps {
  title: string;
  items: readonly LibraryTitle[];
  onSelectDetails: (title: LibraryTitle) => void;
  progressMap?: Record<string, WatchProgressEntry>;
  onRemoveContinueWatching?: (titleId: string) => void;
  error?: string | null;
  onRetry?: () => void;
  eager?: boolean;
}

export const ContentRow: React.FC<ContentRowProps> = React.memo(
  ({
    title,
    items,
    onSelectDetails,
    progressMap,
    onRemoveContinueWatching,
    error = null,
    onRetry,
    eager = false,
  }) => {
    const [containerRef, isVisible] = useInView<HTMLElement>('300px');
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const shouldRender = eager || isVisible;

    const handleScroll = (direction: 'left' | 'right') => {
      const node = scrollerRef.current;
      if (!node) return;
      const delta = Math.max(280, Math.floor(node.clientWidth * 0.8));
      node.scrollBy({
        left: direction === 'left' ? -delta : delta,
        behavior: 'smooth',
      });
    };

    if (!error && items.length === 0) {
      return null;
    }

    return (
      <section
        ref={containerRef}
        aria-label={title}
        className="py-4 md:py-5 relative group/row"
      >
        <div className="px-4 sm:px-8 lg:px-14 mb-3 flex items-baseline justify-between gap-4">
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
            {title}
          </h2>
          <span className="text-xs text-[#b3b3b3] tabular-nums">
            {items.length} {items.length === 1 ? 'title' : 'titles'}
          </span>
        </div>

        {!shouldRender ? (
          <RowSkeleton />
        ) : error ? (
          <div className="mx-4 sm:mx-8 lg:mx-14 p-6 rounded bg-[#1f1f1f] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-white">
                Unable to load &ldquo;{title}&rdquo;
              </p>
              <p className="text-xs text-[#b3b3b3] mt-0.5">{error}</p>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="min-h-[44px] px-4 py-2 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-semibold inline-flex items-center gap-2 transition-opacity cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" aria-hidden="true" />
                <span>Retry Row</span>
              </button>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* Desktop Left Arrow */}
            {items.length > 3 && (
              <button
                type="button"
                onClick={() => handleScroll('left')}
                aria-label={`Scroll ${title} left`}
                className="hidden md:flex items-center justify-center absolute left-1 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] w-11 h-24 rounded bg-black/70 text-white opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-black/90 transition-opacity cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6" aria-hidden="true" />
              </button>
            )}

            {/* Horizontal Scroll-Snap Track */}
            <div
              ref={scrollerRef}
              className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 sm:px-8 lg:px-14 py-2"
            >
              {items.map((item) => (
                <div
                  key={item.id}
                  className="snap-start shrink-0 w-[230px] sm:w-[270px] md:w-[300px] lg:w-[320px]"
                >
                  <TitleCard
                    title={item}
                    layout="row"
                    onSelectDetails={onSelectDetails}
                    progressEntry={progressMap?.[item.id]}
                    onRemoveContinueWatching={onRemoveContinueWatching}
                  />
                </div>
              ))}
            </div>

            {/* Desktop Right Arrow */}
            {items.length > 3 && (
              <button
                type="button"
                onClick={() => handleScroll('right')}
                aria-label={`Scroll ${title} right`}
                className="hidden md:flex items-center justify-center absolute right-1 top-1/2 -translate-y-1/2 z-30 min-w-[44px] min-h-[44px] w-11 h-24 rounded bg-black/70 text-white opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-black/90 transition-opacity cursor-pointer"
              >
                <ChevronRight className="w-6 h-6" aria-hidden="true" />
              </button>
            )}
          </div>
        )}
      </section>
    );
  }
);

ContentRow.displayName = 'ContentRow';
